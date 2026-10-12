/* ==========================================================================
   NOVA — JavaScript global
   Composants natifs (Custom Elements), aucune dépendance externe.
   ========================================================================== */

(() => {
  'use strict';

  const NOVA = (window.NOVA = window.NOVA || {});
  NOVA.routes = NOVA.routes || { root: '/', cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change' };
  NOVA.strings = NOVA.strings || {};

  /* ---------- Utilitaires ---------- */

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  NOVA.debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  NOVA.fetchJSON = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok || data.status) {
      const error = new Error(data.description || data.message || NOVA.strings.cartError);
      error.data = data;
      throw error;
    }
    return data;
  };

  NOVA.parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

  /** Formate un montant en centimes selon le format monétaire de la boutique. */
  NOVA.formatMoney = (cents, format = NOVA.moneyFormat || '{{amount}} €') => {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = Number(cents) / 100;
    const fmt = (n, decimals, thousands = ',', decimal = '.') => {
      if (isNaN(n)) return '0';
      const [int, dec] = n.toFixed(decimals).split('.');
      return int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (dec ? decimal + dec : '');
    };
    const match = format.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!match) return value.toFixed(2);
    let out;
    switch (match[1]) {
      case 'amount': out = fmt(value, 2); break;
      case 'amount_no_decimals': out = fmt(value, 0); break;
      case 'amount_with_comma_separator': out = fmt(value, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': out = fmt(value, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': out = fmt(value, 2, "'", '.'); break;
      case 'amount_with_space_separator': out = fmt(value, 2, ' ', ','); break;
      case 'amount_no_decimals_with_space_separator': out = fmt(value, 0, ' ', ','); break;
      default: out = fmt(value, 2);
    }
    return format.replace(match[0], out);
  };

  NOVA.toast = (message, duration = 2800) => {
    const el = document.getElementById('NovaToast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => (el.hidden = true), 400);
    }, duration);
  };

  /* ---------- Focus trap ---------- */

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let trapHandler = null;

  NOVA.trapFocus = (container, initial) => {
    NOVA.releaseFocus();
    trapHandler = (e) => {
      if (e.key !== 'Tab') return;
      const els = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler);
    (initial || container.querySelector(FOCUSABLE) || container).focus({ preventScroll: true });
  };

  NOVA.releaseFocus = () => {
    if (trapHandler) document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  };

  /* ---------- Animations d'apparition ---------- */

  NOVA.initReveal = (root = document) => {
    const items = root.querySelectorAll('[data-reveal]:not(.is-revealed)');
    if (!items.length) return;
    if (!NOVA.animations || prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
  };

  if (NOVA.animations === false) document.documentElement.classList.add('no-animations');

  /* ---------- Drawer générique (menu mobile, filtres) ---------- */

  class NovaDrawer extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) this.close();
      });
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }

    open(trigger) {
      this._trigger = trigger || document.activeElement;
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      const panel = this.querySelector('.drawer__panel, .search-modal__panel, .modal__panel') || this;
      setTimeout(() => NOVA.trapFocus(panel, this.querySelector('[data-autofocus]')), 50);
      this.dispatchEvent(new CustomEvent('drawer:open', { bubbles: true }));
    }

    close() {
      if (!this.classList.contains('is-open')) return;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      NOVA.releaseFocus();
      if (this._trigger) this._trigger.focus({ preventScroll: true });
      this.dispatchEvent(new CustomEvent('drawer:close', { bubbles: true }));
    }
  }
  customElements.define('nova-drawer', NovaDrawer);

  // Boutons d'ouverture : <button data-open-drawer="MenuDrawer">
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-drawer]');
    if (!trigger) return;
    const target = document.getElementById(trigger.dataset.openDrawer);
    if (target && typeof target.open === 'function') {
      e.preventDefault();
      target.open(trigger);
    }
  });

  /* ---------- Header : sticky intelligent + méga-menu ---------- */

  class NovaHeader extends HTMLElement {
    connectedCallback() {
      this.wrapper = this.closest('.header-wrapper') || this;
      this.hideOnScroll = this.dataset.hideOnScroll === 'true';
      this.lastY = window.scrollY;
      this.onScroll = this.onScroll.bind(this);
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
      this.setHeight();
      window.addEventListener('resize', NOVA.debounce(() => this.setHeight(), 150));

      // Méga-menu : survol sur desktop, clic/clavier partout
      this.querySelectorAll('[data-mega]').forEach((item) => {
        const link = item.querySelector('.nav__link');
        let timer;
        const open = () => { clearTimeout(timer); this.closeAll(item); item.setAttribute('data-open', ''); link.setAttribute('aria-expanded', 'true'); };
        const close = () => { timer = setTimeout(() => { item.removeAttribute('data-open'); link.setAttribute('aria-expanded', 'false'); }, 120); };
        item.addEventListener('mouseenter', open);
        item.addEventListener('mouseleave', close);
        item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) close(); });
        link.addEventListener('click', (e) => {
          if (item.hasAttribute('data-open') && e.detail === 0) return;
          if (!item.hasAttribute('data-open')) { e.preventDefault(); open(); }
        });
        item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); link.focus(); } });
      });
    }

    closeAll(except) {
      this.querySelectorAll('[data-mega][data-open]').forEach((el) => {
        if (el !== except) el.removeAttribute('data-open');
      });
    }

    setHeight() {
      const h = this.wrapper.offsetHeight;
      document.documentElement.style.setProperty('--header-offset', `${h}px`);
    }

    onScroll() {
      const y = window.scrollY;
      this.wrapper.classList.toggle('is-scrolled', y > 10);
      if (this.hideOnScroll && !this.querySelector('[data-open]')) {
        const hide = y > this.lastY && y > 300;
        this.wrapper.classList.toggle('is-hidden', hide);
        document.documentElement.style.setProperty('--header-offset', hide ? '0px' : `${this.wrapper.offsetHeight}px`);
      }
      this.lastY = y;
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
    }
  }
  customElements.define('nova-header', NovaHeader);

  /* ---------- Barre d'annonces (rotation) ---------- */

  class AnnouncementBar extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('.announcement__slide')];
      if (this.slides.length < 2 || prefersReducedMotion()) return;
      this.index = 0;
      const speed = Number(this.dataset.speed || 5) * 1000;
      this.timer = setInterval(() => this.next(), speed);
      this.addEventListener('mouseenter', () => clearInterval(this.timer));
      this.addEventListener('mouseleave', () => { clearInterval(this.timer); this.timer = setInterval(() => this.next(), speed); });
    }
    next() {
      this.slides[this.index].setAttribute('aria-hidden', 'true');
      this.index = (this.index + 1) % this.slides.length;
      this.slides[this.index].setAttribute('aria-hidden', 'false');
    }
    disconnectedCallback() { clearInterval(this.timer); }
  }
  customElements.define('announcement-bar', AnnouncementBar);

  /* ---------- Diaporama hero ---------- */

  class NovaSlideshow extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.dots = [...this.querySelectorAll('.slideshow__dot')];
      this.index = 0;
      this.delay = Number(this.dataset.autoplay || 0) * 1000;
      this.dots.forEach((dot, i) => dot.addEventListener('click', () => this.go(i, true)));
      this.go(0);
      if (this.delay && this.slides.length > 1 && !prefersReducedMotion()) {
        this.play();
        this.addEventListener('mouseenter', () => this.pause());
        this.addEventListener('mouseleave', () => this.play());
        this.addEventListener('focusin', () => this.pause());
      }
      this.querySelectorAll('.hero').forEach((h) => h.classList.add('is-loaded'));
    }
    go(i, user = false) {
      this.index = (i + this.slides.length) % this.slides.length;
      this.slides.forEach((s, n) => {
        s.classList.toggle('is-active', n === this.index);
        s.setAttribute('aria-hidden', n === this.index ? 'false' : 'true');
        s.querySelectorAll('a, button').forEach((el) => (el.tabIndex = n === this.index ? 0 : -1));
      });
      this.dots.forEach((d, n) => {
        d.classList.remove('is-active');
        d.setAttribute('aria-current', n === this.index ? 'true' : 'false');
        if (n === this.index) { void d.offsetWidth; d.classList.add('is-active'); }
      });
      if (user && this.delay) this.play();
    }
    play() { this.pause(); this.classList.remove('is-paused'); this.timer = setInterval(() => this.go(this.index + 1), this.delay); }
    pause() { clearInterval(this.timer); this.classList.add('is-paused'); }
    disconnectedCallback() { this.pause(); }
  }
  customElements.define('nova-slideshow', NovaSlideshow);

  /* ---------- Compte à rebours promo ---------- */

  class CountDown extends HTMLElement {
    connectedCallback() {
      this.end = new Date(this.dataset.end).getTime();
      if (isNaN(this.end)) { this.hidden = true; return; }
      this.els = {
        d: this.querySelector('[data-days]'),
        h: this.querySelector('[data-hours]'),
        m: this.querySelector('[data-minutes]'),
        s: this.querySelector('[data-seconds]'),
      };
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    }
    tick() {
      const diff = Math.max(0, this.end - Date.now());
      const pad = (n) => String(n).padStart(2, '0');
      this.els.d.textContent = pad(Math.floor(diff / 864e5));
      this.els.h.textContent = pad(Math.floor((diff / 36e5) % 24));
      this.els.m.textContent = pad(Math.floor((diff / 6e4) % 60));
      this.els.s.textContent = pad(Math.floor((diff / 1e3) % 60));
      if (diff === 0) {
        clearInterval(this.timer);
        if (this.dataset.hideOnEnd === 'true') this.closest('.shopify-section')?.setAttribute('hidden', '');
      }
    }
    disconnectedCallback() { clearInterval(this.timer); }
  }
  customElements.define('count-down', CountDown);

  /* ---------- Copier un code promo ---------- */

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      const label = btn.textContent;
      btn.textContent = btn.dataset.copiedLabel || 'Copié !';
      setTimeout(() => (btn.textContent = label), 1800);
    } catch (_) {
      /* presse-papiers indisponible : le code reste visible */
    }
  });

  /* ---------- Sélecteur de quantité ---------- */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      this.querySelectorAll('button').forEach((btn) =>
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const step = Number(this.input.step) || 1;
          const min = Number(this.input.min) || 0;
          const max = this.input.max ? Number(this.input.max) : Infinity;
          const current = Number(this.input.value) || 0;
          const next = btn.name === 'plus' ? current + step : current - step;
          this.input.value = Math.min(max, Math.max(min, next));
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        })
      );
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* ---------- Modale générique / guide des tailles ---------- */

  class NovaModal extends NovaDrawer {}
  customElements.define('nova-modal', NovaModal);

  /* ---------- Panier : ajout au panier ---------- */

  NOVA.cartSections = () => {
    const sections = ['cart-icon-bubble'];
    if (document.getElementById('CartDrawer')) sections.push('cart-drawer');
    return sections;
  };

  NOVA.renderCartSections = (sections) => {
    if (!sections) return;
    if (sections['cart-drawer']) {
      const doc = NOVA.parseHTML(sections['cart-drawer']);
      const fresh = doc.getElementById('CartDrawerInner');
      const current = document.getElementById('CartDrawerInner');
      if (fresh && current) current.replaceWith(fresh);
    }
    if (sections['cart-icon-bubble']) {
      const doc = NOVA.parseHTML(sections['cart-icon-bubble']);
      const fresh = doc.querySelector('[data-cart-count]');
      document.querySelectorAll('[data-cart-count-wrapper]').forEach((wrap) => {
        wrap.innerHTML = fresh ? fresh.outerHTML : '';
        const bubble = wrap.querySelector('.cart-count');
        if (bubble) bubble.classList.add('is-bumped');
      });
    }
  };

  NOVA.addToCart = async (formData) => {
    formData.append('sections', NOVA.cartSections().join(','));
    formData.append('sections_url', window.location.pathname);
    const res = await fetch(`${NOVA.routes.cartAdd}.js`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.status) {
      const error = new Error(data.description || data.message || NOVA.strings.cartError);
      throw error;
    }
    NOVA.renderCartSections(data.sections);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { item: data } }));
    return data;
  };

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.submitButton = this.form.querySelector('[type="submit"]');
      this.errorEl = this.querySelector('[data-form-error]');
      this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    async onSubmit(e) {
      // Panier en mode « page » : on laisse le comportement natif de Shopify.
      if (NOVA.cartType === 'page' && !this.dataset.ajax) return;
      e.preventDefault();
      if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

      this.setError();
      this.submitButton.classList.add('is-loading');
      this.submitButton.setAttribute('aria-disabled', 'true');

      try {
        await NOVA.addToCart(new FormData(this.form));
        const drawer = document.getElementById('CartDrawer');
        if (drawer && NOVA.cartType === 'drawer') {
          document.querySelectorAll('nova-modal.is-open, nova-drawer.is-open').forEach((m) => m.close());
          drawer.open(this.submitButton);
        } else {
          NOVA.toast(NOVA.strings.added);
        }
      } catch (err) {
        this.setError(err.message);
      } finally {
        this.submitButton.classList.remove('is-loading');
        this.submitButton.removeAttribute('aria-disabled');
      }
    }

    setError(message) {
      if (!this.errorEl) { if (message) NOVA.toast(message); return; }
      this.errorEl.hidden = !message;
      this.errorEl.textContent = message || '';
    }
  }
  customElements.define('product-form', ProductForm);

  /* ---------- Sélecteur de variantes ---------- */

  class VariantPicker extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.section;
      this.variants = JSON.parse(this.querySelector('[type="application/json"]').textContent);
      this.addEventListener('change', () => this.onChange());
      this.updateAvailability();
    }

    selectedOptions() {
      return [...this.querySelectorAll('fieldset, [data-option-select]')].map((group) => {
        if (group.tagName === 'SELECT') return group.value;
        const checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    onChange() {
      const options = this.selectedOptions();
      this.querySelectorAll('[data-selected-value]').forEach((el, i) => (el.textContent = options[i] || ''));
      const variant = this.variants.find((v) => v.options.every((opt, i) => opt === options[i]));
      this.updateAvailability();
      this.dispatchEvent(new CustomEvent('variant:change', { bubbles: true, detail: { variant } }));

      const root = document.getElementById(`ProductInfo-${this.sectionId}`) || document;
      const idInputs = document.querySelectorAll(`[data-variant-id-input="${this.sectionId}"]`);
      const buttons = document.querySelectorAll(`[data-add-button="${this.sectionId}"]`);
      const priceEls = document.querySelectorAll(`[data-price="${this.sectionId}"]`);
      const inventoryEl = root.querySelector('[data-inventory]');
      const skuEl = root.querySelector('[data-sku]');

      buttons.forEach((btn) => {
        const label = btn.querySelector('[data-label]') || btn;
        if (!variant) {
          btn.setAttribute('disabled', '');
          label.textContent = NOVA.strings.unavailable;
        } else if (!variant.available) {
          btn.setAttribute('disabled', '');
          label.textContent = NOVA.strings.soldOut;
        } else {
          btn.removeAttribute('disabled');
          label.textContent = NOVA.strings.addToCart;
        }
      });

      if (!variant) return;

      idInputs.forEach((input) => {
        input.value = variant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      priceEls.forEach((el) => {
        const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        el.classList.toggle('price--on-sale', !!onSale);
        const current = el.querySelector('.price__current');
        const compare = el.querySelector('.price__compare');
        const badge = el.querySelector('[data-sale-badge]');
        if (current) current.textContent = NOVA.formatMoney(variant.price);
        if (compare) {
          compare.hidden = !onSale;
          compare.textContent = onSale ? NOVA.formatMoney(variant.compare_at_price) : '';
        }
        if (badge) {
          badge.hidden = !onSale;
          if (onSale) badge.textContent = `-${Math.round(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price)}%`;
        }
      });

      if (inventoryEl) {
        inventoryEl.classList.toggle('inventory--out', !variant.available);
        inventoryEl.classList.toggle('inventory--low', false);
        inventoryEl.textContent = variant.available ? inventoryEl.dataset.inStock : inventoryEl.dataset.outOfStock;
      }
      if (skuEl) skuEl.textContent = variant.sku || '';

      if (variant.featured_media) {
        document.dispatchEvent(new CustomEvent('gallery:goto', { detail: { section: this.sectionId, mediaId: variant.featured_media.id } }));
      }

      if (this.dataset.updateUrl !== 'false') {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }

    /** Barre les valeurs d'options qui ne forment aucune variante disponible avec la sélection actuelle. */
    updateAvailability() {
      const selected = this.selectedOptions();
      const groups = [...this.querySelectorAll('fieldset')];
      groups.forEach((group) => {
        const position = Number(group.dataset.position);
        group.querySelectorAll('input').forEach((input) => {
          const available = this.variants.some(
            (v) => v.available && v.options[position] === input.value && v.options.every((opt, i) => i === position || i > position || opt === selected[i])
          );
          input.classList.toggle('is-unavailable', !available);
        });
      });
    }
  }
  customElements.define('variant-picker', VariantPicker);

  /* ---------- Galerie produit ---------- */

  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('.product-gallery__slides');
      this.slides = [...this.querySelectorAll('.product-gallery__slide')];
      this.thumbs = [...this.querySelectorAll('.product-gallery__thumb')];
      this.prev = this.querySelector('.product-gallery__nav--prev');
      this.next = this.querySelector('.product-gallery__nav--next');
      this.counter = this.querySelector('[data-counter]');
      this.index = 0;
      if (!this.track) return;

      this.thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => this.go(i)));
      this.prev?.addEventListener('click', () => this.go(this.index - 1));
      this.next?.addEventListener('click', () => this.go(this.index + 1));
      this.track.addEventListener('scroll', NOVA.debounce(() => this.syncFromScroll(), 60), { passive: true });
      this.track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') this.go(this.index - 1);
        if (e.key === 'ArrowRight') this.go(this.index + 1);
      });

      document.addEventListener('gallery:goto', (e) => {
        if (e.detail.section !== this.dataset.section) return;
        const i = this.slides.findIndex((s) => s.dataset.mediaId === String(e.detail.mediaId));
        if (i > -1) this.go(i);
      });

      const lightbox = document.getElementById(`Lightbox-${this.dataset.section}`);
      if (lightbox) {
        this.slides.forEach((slide) => {
          const media = slide.querySelector('[data-zoom]');
          if (!media) return;
          media.addEventListener('click', () => {
            const target = lightbox.querySelector('[data-lightbox-image]');
            target.src = media.dataset.zoom;
            target.alt = media.dataset.alt || '';
            lightbox.open(media);
          });
        });
      }
      this.update();
    }

    go(i) {
      this.index = Math.max(0, Math.min(this.slides.length - 1, i));
      const slide = this.slides[this.index];
      this.track.scrollTo({ left: slide.offsetLeft - this.track.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      this.update();
    }

    syncFromScroll() {
      const i = Math.round(this.track.scrollLeft / this.track.clientWidth);
      if (i !== this.index) { this.index = i; this.update(); }
    }

    update() {
      this.thumbs.forEach((t, n) => t.setAttribute('aria-current', n === this.index ? 'true' : 'false'));
      const active = this.thumbs[this.index];
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (this.prev) this.prev.disabled = this.index === 0;
      if (this.next) this.next.disabled = this.index === this.slides.length - 1;
      if (this.counter) this.counter.textContent = `${this.index + 1} / ${this.slides.length}`;
      this.slides.forEach((s, n) => {
        if (n !== this.index) s.querySelectorAll('video').forEach((v) => v.pause());
      });
    }
  }
  customElements.define('product-gallery', ProductGallery);

  /* ---------- Barre d'ajout au panier collante (fiche produit) ---------- */

  class StickyAtc extends HTMLElement {
    connectedCallback() {
      const target = document.getElementById(this.dataset.target);
      if (!target || !('IntersectionObserver' in window)) return;
      const bar = this.querySelector('.sticky-atc');
      new IntersectionObserver(([entry]) => {
        bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      }).observe(target);
    }
  }
  customElements.define('sticky-atc', StickyAtc);

  /* ---------- Produits recommandés (API Shopify) ---------- */

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (!('IntersectionObserver' in window)) return this.load();
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        this.load();
      }, { rootMargin: '0px 0px 400px 0px' });
      io.observe(this);
    }

    async load() {
      try {
        const res = await fetch(this.dataset.url);
        const html = await res.text();
        const fresh = NOVA.parseHTML(html).querySelector('product-recommendations');
        if (fresh && fresh.innerHTML.trim().length) {
          this.innerHTML = fresh.innerHTML;
          NOVA.initReveal(this);
        } else {
          this.closest('.shopify-section')?.setAttribute('hidden', '');
        }
      } catch (_) {
        this.closest('.shopify-section')?.setAttribute('hidden', '');
      }
    }
  }
  customElements.define('product-recommendations', ProductRecommendations);

  /* ---------- Filtres et tri de collection (Section Rendering API) ---------- */

  class CollectionFilters extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.section;
      this.addEventListener('change', NOVA.debounce((e) => this.apply(e.target.closest('form.facets')), 400));
      this.addEventListener('submit', (e) => {
        e.preventDefault();
        this.apply(e.target);
      });
      this.addEventListener('click', (e) => {
        const link = e.target.closest('[data-facet-link]');
        if (!link) return;
        e.preventDefault();
        this.fetchAndRender(new URL(link.href, window.location.origin).searchParams.toString());
      });
      window.addEventListener('popstate', () => this.fetchAndRender(window.location.search.slice(1), false));
    }

    apply(form) {
      // Les filtres (barre latérale ou tiroir) et le tri sont fusionnés en une seule requête.
      const facetsForm = form && form.classList.contains('facets') ? form : this.querySelector('form.facets');
      const params = new URLSearchParams(facetsForm ? new FormData(facetsForm) : undefined);
      [...params.entries()].forEach(([k, v]) => { if (v === '') params.delete(k); });
      const sortSelect = this.querySelector('select[name="sort_by"]');
      if (sortSelect) params.set('sort_by', sortSelect.value);
      this.fetchAndRender(params.toString());
    }

    async fetchAndRender(query, push = true) {
      const results = document.getElementById(`CollectionProducts-${this.sectionId}`);
      results?.classList.add('is-loading');
      const url = `${window.location.pathname}?section_id=${this.sectionId}&${query}`;
      try {
        const html = await (await fetch(url)).text();
        const doc = NOVA.parseHTML(html);
        ['CollectionProducts', 'FacetsSidebar', 'FacetsDrawerBody', 'ProductCount', 'ActiveFacets'].forEach((id) => {
          const fresh = doc.getElementById(`${id}-${this.sectionId}`);
          const current = document.getElementById(`${id}-${this.sectionId}`);
          if (fresh && current) current.innerHTML = fresh.innerHTML;
        });
        NOVA.initReveal(document.getElementById(`CollectionProducts-${this.sectionId}`) || document);
        if (push) window.history.pushState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
      } finally {
        document.getElementById(`CollectionProducts-${this.sectionId}`)?.classList.remove('is-loading');
      }
    }
  }
  customElements.define('collection-filters', CollectionFilters);

  /* ---------- Initialisation ---------- */

  const init = () => {
    NOVA.initReveal();
    document.querySelectorAll('.hero:not([data-slide])').forEach((h) => h.classList.add('is-loaded'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Éditeur de thème : réinitialise les animations quand une section est rechargée
  document.addEventListener('shopify:section:load', (e) => NOVA.initReveal(e.target));
  document.addEventListener('shopify:block:select', (e) => {
    const slideshow = e.target.closest('nova-slideshow');
    if (slideshow) {
      const i = [...slideshow.querySelectorAll('[data-slide]')].indexOf(e.target);
      if (i > -1) { slideshow.go(i); slideshow.pause(); }
    }
  });
})();
