/* Assistant NOVA : réponses aux questions fréquentes + transmission à l'équipe */
(() => {
  if (customElements.get('support-bot')) return;

  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
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
      this.ask(text, this.match(text));
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

    ask(question, answer) {
      this.addMessage('user', question);
      this.lastQuestion = question;
      const typing = this.addMessage('bot', '<span class="bot__typing"><span></span><span></span><span></span></span>');
      setTimeout(() => {
        typing.remove();
        if (answer) {
          this.addMessage('bot', answer.html);
          this.addFollowup();
        } else {
          this.addMessage('bot', this.fallbackHtml);
          this.showHandoff();
        }
      }, 650);
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
