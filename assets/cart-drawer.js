/* ==========================================================================
   NOVA — Panier interactif (tiroir latéral + page panier)
   Utilise l'API AJAX Cart de Shopify et la Section Rendering API.
   ========================================================================== */

(() => {
  'use strict';
  const NOVA = window.NOVA;

  /** Logique partagée entre le tiroir et la page panier. */
  const CartMixin = (Base) =>
    class extends Base {
      bindCart() {
        this.addEventListener('change', NOVA.debounce((e) => {
          const input = e.target.closest('[data-line-quantity]');
          if (input) this.updateLine(input.dataset.lineQuantity, Number(input.value), input.dataset.key);
          if (e.target.matches('[name="note"]')) this.updateNote(e.target.value);
        }, 350));

        this.addEventListener('click', (e) => {
          const remove = e.target.closest('[data-line-remove]');
          if (!remove) return;
          e.preventDefault();
          this.updateLine(remove.dataset.lineRemove, 0, remove.dataset.key);
        });
      }

      sectionsToRender() {
        const list = NOVA.cartSections();
        if (this.dataset.section) list.push(this.dataset.section);
        return list;
      }

      async updateLine(line, quantity, key) {
        const item = this.querySelector(`[data-cart-item="${key}"]`);
        item?.classList.add('is-loading');
        try {
          const data = await NOVA.fetchJSON(`${NOVA.routes.cartChange}.js`, {
            method: 'POST',
            body: JSON.stringify({ line: Number(line), quantity, sections: this.sectionsToRender(), sections_url: window.location.pathname }),
          });
          const updatedItem = data.items.find((i) => i.key === key);
          if (quantity > 0 && updatedItem && updatedItem.quantity < quantity) {
            NOVA.toast(NOVA.strings.quantityError.replace('[quantity]', updatedItem.quantity));
          }
          NOVA.renderCartSections(data.sections);
          if (this.dataset.section && data.sections[this.dataset.section]) {
            const doc = NOVA.parseHTML(data.sections[this.dataset.section]);
            const fresh = doc.getElementById('MainCart');
            const current = document.getElementById('MainCart');
            if (fresh && current) current.replaceWith(fresh);
          }
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
        } catch (err) {
          item?.classList.remove('is-loading');
          NOVA.toast(err.message || NOVA.strings.cartError);
        }
      }

      updateNote(note) {
        fetch(`${NOVA.routes.cartUpdate}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ note }),
        });
      }
    };

  class CartDrawer extends CartMixin(customElements.get('nova-drawer')) {
    connectedCallback() {
      super.connectedCallback();
      this.bindCart();
      // Ouverture depuis l'icône panier du header
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-cart-trigger]');
        if (!trigger || NOVA.cartType !== 'drawer') return;
        e.preventDefault();
        this.open(trigger);
      });
    }
  }

  class CartItems extends CartMixin(HTMLElement) {
    connectedCallback() {
      this.bindCart();
    }
  }

  const define = () => {
    if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);
    if (!customElements.get('cart-items')) customElements.define('cart-items', CartItems);
  };

  // global.js est chargé en premier (defer conserve l'ordre), mais on sécurise.
  if (customElements.get('nova-drawer')) define();
  else customElements.whenDefined('nova-drawer').then(define);
})();
