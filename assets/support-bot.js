/* Assistant NOVA : réponses aux questions fréquentes + transmission à l'équipe */
(() => {
  if (customElements.get('support-bot')) return;

  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9%]+/g, ' ')
      .trim();

  class SupportBot extends HTMLElement {
    connectedCallback() {
      this.launcher = this.querySelector('.bot__launcher');
      this.panel = this.querySelector('.bot__panel');
      this.messages = this.querySelector('[data-bot-messages]');
      this.chips = this.querySelector('[data-bot-chips]');
      this.composer = this.querySelector('[data-bot-composer]');
      this.input = this.querySelector('[data-bot-input]');
      this.handoffFields = this.querySelector('[data-bot-handoff-fields]');
      this.body = this.querySelector('[data-bot-body]');
      this.transcript = [];

      this.answers = [...this.querySelectorAll('template[data-bot-answer]')].map((tpl) => ({
        id: tpl.dataset.botAnswer,
        label: tpl.dataset.label,
        html: tpl.innerHTML,
        keywords: (tpl.dataset.keywords || '')
          .split(/[,\n]/)
          .map(normalize)
          .filter(Boolean),
      }));
      const fallback = this.querySelector('template[data-bot-fallback]');
      this.fallbackHtml = fallback ? fallback.innerHTML : '';
      const followup = this.querySelector('template[data-bot-followup]');
      this.followupText = followup ? followup.innerHTML.trim() : '';

      this.launcher.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
      this.querySelector('[data-bot-close]').addEventListener('click', () => this.close());
      // Sur téléphone, toucher le fond sombre ferme l'assistant
      this.addEventListener('click', (e) => {
        if (e.target === this && this.isOpen) this.close();
      });
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });

      this.chips.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-bot-chip]');
        if (chip) {
          const answer = this.answers.find((a) => a.id === chip.dataset.botChip);
          if (answer) this.ask(chip.textContent.trim(), answer);
          return;
        }
        if (e.target.closest('[data-bot-handoff]')) this.showHandoff();
      });

      this.querySelector('[data-bot-send]').addEventListener('click', () => this.submitQuestion());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitQuestion();
        }
      });

      this.messages.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-bot-reply]');
        if (!btn) return;
        btn.closest('.bot__actions').remove();
        if (btn.dataset.botReply === 'yes') {
          this.addMessage('user', btn.textContent.trim());
          this.addMessage('bot', '<p>Avec plaisir ! Je reste là si vous avez une autre question. 🐾</p>');
        } else {
          this.addMessage('user', btn.textContent.trim());
          this.showHandoff();
        }
      });

      if (this.dataset.open === 'true') {
        if (!this.handoffFields.hidden) this.composer.hidden = true;
        this.open();
      }
    }

    get isOpen() {
      return !this.panel.hidden;
    }

    open() {
      this.panel.hidden = false;
      this.classList.add('is-open');
      this.launcher.setAttribute('aria-expanded', 'true');
      document.body.classList.add('bot-is-open');
      requestAnimationFrame(() => {
        this.scrollToEnd();
        if (window.matchMedia('(min-width: 750px)').matches && !this.composer.hidden) this.input.focus();
      });
    }

    close() {
      this.panel.hidden = true;
      this.classList.remove('is-open');
      this.launcher.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('bot-is-open');
      this.launcher.focus();
    }

    submitQuestion() {
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = '';
      const query = normalize(text);
      const faq = this.match(text);
      const found = this.lookupGlossary(text);
      // « C'est quoi… », « À quoi sert… » : la définition passe en premier
      const asksDefinition = /(c est quoi|cest quoi|c quoi|c koi|qu est ce|quest ce|que veut dire|veut dire quoi|ca veut dire|signifie|definition|definir|a quoi sert|a quoi servent|sert a quoi|servent a quoi|kesako|explique)/.test(query);
      const asksHowWhy = /(comment|pourquoi|est ce que|faut il|dois je|quand|combien)/.test(query);
      if (found && (asksDefinition || (!faq && asksHowWhy))) {
        this.ask(text, null, { definition: found.entry });
      } else if (faq) {
        this.ask(text, faq);
      } else {
        const generic = ['chien', 'chienne', 'chat', 'chatte', 'toutou', 'minou', 'felin'];
        const short = query.split(' ').length <= 3;
        const fallbackDefinition = found && (short || !generic.includes(found.term)) ? found.entry : null;
        this.ask(text, null, { fallbackDefinition });
      }
    }

    lookupGlossary(text) {
      const glossary = window.NOVA_GLOSSARY || [];
      const query = ` ${normalize(text)} `;
      let best = null;
      glossary.forEach((entry) => {
        entry.terms.forEach((raw) => {
          const term = normalize(raw);
          if (!term) return;
          const variants = [term, `${term}s`, `${term}x`, term.replace(/al$/, 'aux')];
          if (variants.some((v) => query.includes(` ${v} `)) && (!best || term.length > best.term.length)) {
            best = { entry, term };
          }
        });
      });
      return best;
    }

    match(text) {
      const query = ` ${normalize(text)} `;
      let best = null;
      let bestScore = 0;
      this.answers.forEach((answer) => {
        let score = 0;
        answer.keywords.forEach((kw) => {
          if (query.includes(` ${kw} `)) score += 2 + kw.split(' ').length;
          else if (kw.length >= 5 && query.includes(kw)) score += 1;
        });
        if (score > bestScore) {
          best = answer;
          bestScore = score;
        }
      });
      return best;
    }

    ask(question, answer, options = {}) {
      const { definition, fallbackDefinition } = options;
      this.addMessage('user', question);
      this.lastQuestion = question;
      const typing = this.addMessage('bot', '<span class="bot__typing"><span></span><span></span><span></span></span>');
      const wait = new Promise((resolve) => setTimeout(resolve, 650));
      let products = Promise.resolve([]);
      if (definition) products = definition.search ? this.searchProducts([definition.search]) : products;
      else if (!answer) products = this.searchProducts(this.searchWords(question));
      Promise.all([wait, products]).then(([, found]) => {
        typing.remove();
        if (answer) {
          this.misses = 0;
          this.addMessage('bot', answer.html);
          // Pas de « ça répond à votre question ? » après un simple bonjour ou merci
          const text = answer.html.replace(/<[^>]+>/g, '').trim();
          if (text.length > 110) this.addFollowup();
        } else if (definition) {
          this.misses = 0;
          const extra = found.length ? `<p>Chez NOVA, nous proposons :</p>${this.productsHtml(found)}` : '';
          this.addMessage('bot', `${this.definitionHtml(definition)}${extra}`);
        } else if (found.length) {
          this.misses = 0;
          this.addMessage('bot', `<p>Voici ce que j'ai trouvé dans la boutique :</p>${this.productsHtml(found)}<p><a href="${this.searchUrl(question)}">Voir tous les résultats</a></p>`);
        } else if (fallbackDefinition) {
          this.misses = 0;
          this.addMessage('bot', this.definitionHtml(fallbackDefinition));
        } else {
          this.misses = (this.misses || 0) + 1;
          this.addMessage('bot', this.fallbackHtml);
          // Le formulaire ne s'ouvre tout seul qu'après deux questions sans réponse
          if (this.misses >= 2) this.showHandoff();
          else this.chips.hidden = false;
        }
      });
    }

    definitionHtml(entry) {
      return `<p>📖 <strong>${entry.title}</strong></p><p>${entry.text}</p>`;
    }

    searchWords(question) {
      const stop = new Set(['avez', 'vous', 'est', 'que', 'qui', 'quoi', 'des', 'les', 'une', 'pour', 'mon', 'mes', 'votre', 'vos', 'avec', 'dans', 'sur', 'pas', 'plus', 'cherche', 'recherche', 'voudrais', 'veux', 'aimerais', 'acheter', 'trouver', 'vendez', 'faites', 'quel', 'quelle', 'quels', 'quelles', 'bonjour', 'merci', 'chose', 'truc', 'produit', 'produits', 'chien', 'chiens', 'chat', 'chats', 'comment', 'pourquoi', 'combien']);
      return normalize(question)
        .split(' ')
        .filter((w) => w.length >= 4 && !stop.has(w))
        .slice(0, 3);
    }

    searchUrl(question) {
      const root = ((window.NOVA && NOVA.routes && NOVA.routes.root) || '/').replace(/\/$/, '');
      return `${root}/search?q=${encodeURIComponent(question)}&type=product`;
    }

    async searchProducts(words) {
      const route = window.NOVA && NOVA.routes && NOVA.routes.predictiveSearch;
      if (!route || !words.length) return [];
      for (const word of words) {
        try {
          const url = `${route}.json?q=${encodeURIComponent(word)}&resources[type]=product&resources[limit]=3&resources[options][fields]=title,product_type,tag,variants.title`;
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!res.ok) continue;
          const data = await res.json();
          const list = (data.resources && data.resources.results && data.resources.results.products) || [];
          if (list.length) return list;
        } catch (e) {
          return [];
        }
      }
      return [];
    }

    productsHtml(products) {
      const money = (value) => {
        const n = Number(String(value).replace(',', '.'));
        return Number.isFinite(n) ? n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : value;
      };
      const items = products
        .map((p) => {
          const img = p.image ? `<img src="${p.image}${p.image.includes('?') ? '&' : '?'}width=120" alt="" loading="lazy" width="56" height="56">` : '';
          const title = String(p.title).replace(/</g, '&lt;');
          return `<a class="bot__product" href="${p.url}">${img}<span><strong>${title}</strong><span>${money(p.price)}</span></span></a>`;
        })
        .join('');
      return `<div class="bot__products">${items}</div>`;
    }

    addFollowup() {
      if (!this.followupText) return;
      const el = document.createElement('div');
      el.className = 'bot__actions';
      el.innerHTML = `<p>${this.followupText}</p>
        <button type="button" class="bot__chip" data-bot-reply="yes">Oui, merci</button>
        <button type="button" class="bot__chip bot__chip--human" data-bot-reply="no">Non, écrire à l'équipe</button>`;
      this.messages.appendChild(el);
      this.scrollToEnd();
    }

    addMessage(from, html) {
      const el = document.createElement('div');
      el.className = `bot__msg bot__msg--${from}`;
      if (from === 'user') el.textContent = html;
      else el.innerHTML = html;
      this.messages.appendChild(el);
      if (from === 'user') this.transcript.push(`Client : ${html}`);
      this.scrollToEnd();
      return el;
    }

    showHandoff() {
      this.handoffFields.hidden = false;
      this.composer.hidden = true;
      this.chips.hidden = true;
      if (this.body && !this.body.value) {
        const history = this.transcript.length ? `\n\n— Questions posées à l'assistant —\n${this.transcript.join('\n')}` : '';
        this.body.value = `${this.lastQuestion || ''}${history}`.trim();
      }
      this.scrollToEnd();
      const email = this.handoffFields.querySelector('input[type="email"]');
      (email && !email.value ? email : this.body).focus({ preventScroll: true });
    }

    scrollToEnd() {
      const scroller = this.panel.querySelector('.bot__scroll') || this.messages;
      scroller.scrollTop = scroller.scrollHeight;
      this.panel.scrollTop = this.panel.scrollHeight;
    }
  }

  customElements.define('support-bot', SupportBot);
})();
