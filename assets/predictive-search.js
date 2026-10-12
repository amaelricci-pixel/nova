/* ==========================================================================
   NOVA — Recherche prédictive
   Utilise l'API Predictive Search de Shopify (/search/suggest).
   ========================================================================== */

(() => {
  'use strict';
  const NOVA = window.NOVA;

  const define = () => {
    class PredictiveSearch extends customElements.get('nova-drawer') {
      connectedCallback() {
        super.connectedCallback();
        this.input = this.querySelector('input[type="search"]');
        this.results = this.querySelector('[data-predictive-results]');
        this.defaultContent = this.querySelector('[data-predictive-default]');
        this.cache = new Map();
        this.input.addEventListener('input', NOVA.debounce(() => this.onInput(), 250));
        this.input.addEventListener('keydown', (e) => this.onKeydown(e));
        this.addEventListener('drawer:open', () => setTimeout(() => this.input.focus(), 80));

        // Raccourci clavier « / » pour ouvrir la recherche
        document.addEventListener('keydown', (e) => {
          if (e.key !== '/' || e.target.closest('input, textarea, [contenteditable]')) return;
          e.preventDefault();
          this.open();
        });
      }

      async onInput() {
        const q = this.input.value.trim();
        if (!q) {
          this.results.innerHTML = '';
          this.results.hidden = true;
          if (this.defaultContent) this.defaultContent.hidden = false;
          return;
        }
        if (this.abort) this.abort.abort();
        this.abort = new AbortController();

        if (this.cache.has(q)) return this.render(this.cache.get(q));

        const params = new URLSearchParams({
          q,
          section_id: 'predictive-search',
          'resources[type]': 'product,collection,query,page',
          'resources[limit]': '6',
          'resources[options][unavailable_products]': 'last',
        });
        try {
          const res = await fetch(`${NOVA.routes.predictiveSearch}?${params}`, { signal: this.abort.signal });
          if (!res.ok) throw new Error(res.status);
          const html = NOVA.parseHTML(await res.text()).querySelector('#shopify-section-predictive-search')?.innerHTML || '';
          this.cache.set(q, html);
          this.render(html);
        } catch (err) {
          if (err.name !== 'AbortError') this.results.hidden = true;
        }
      }

      render(html) {
        this.results.innerHTML = html;
        this.results.hidden = false;
        if (this.defaultContent) this.defaultContent.hidden = true;
        this.selectedIndex = -1;
      }

      onKeydown(e) {
        const items = [...this.results.querySelectorAll('[data-predictive-item]')];
        if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
        if (e.key === 'Enter') {
          const selected = items[this.selectedIndex];
          if (selected) { e.preventDefault(); window.location.href = selected.href; }
          return;
        }
        e.preventDefault();
        this.selectedIndex = e.key === 'ArrowDown'
          ? (this.selectedIndex + 1) % items.length
          : (this.selectedIndex - 1 + items.length) % items.length;
        items.forEach((el, i) => el.setAttribute('aria-selected', i === this.selectedIndex ? 'true' : 'false'));
        items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    if (!customElements.get('predictive-search')) customElements.define('predictive-search', PredictiveSearch);
  };

  if (customElements.get('nova-drawer')) define();
  else customElements.whenDefined('nova-drawer').then(define);
})();
