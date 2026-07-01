// DraftPilot - UI Popover Rendering

/* global DraftPilotContext:readonly */

const _m = (key) => chrome.i18n.getMessage(key);

/* exported DraftPilotUI */
// eslint-disable-next-line no-unused-vars
const DraftPilotUI = {
  INTENTS: [
    { emoji: '👍', labelKey: 'intentAgree', value: 'agree' },
    { emoji: '🤔', labelKey: 'intentQuestion', value: 'question' },
    { emoji: '❌', labelKey: 'intentDisagree', value: 'disagree' },
    { emoji: '💡', labelKey: 'intentSuggestion', value: 'suggestion' },
    { emoji: '🐛', labelKey: 'intentInfo', value: 'info' },
    { emoji: '🙏', labelKey: 'intentHelp', value: 'help' },
  ],

  selectedIntent: null,
  popoverEl: null,

  createPopover() {
    const popover = document.createElement('div');
    popover.className = 'draftpilot-popover';
    popover.innerHTML = `
      <div class="draftpilot-popover-title">${_m('popoverTitle')}</div>
      <div class="draftpilot-intents">
        ${this.INTENTS.map((i) => `<button class="draftpilot-intent-btn" data-intent="${i.value}">${i.emoji} ${_m(i.labelKey)}</button>`).join('')}
      </div>
      <textarea class="draftpilot-input" placeholder="${_m('inputPlaceholder')}"></textarea>
      <div class="draftpilot-btn-row">
        <button class="draftpilot-generate-btn">${_m('generateBtn')}</button>
        <button class="draftpilot-history-btn" title="${_m('historyBtn')}">📜</button>
      </div>
      <div class="draftpilot-error draftpilot-hidden"></div>
      <div class="draftpilot-draft-section draftpilot-hidden">
        <div class="draftpilot-draft" contenteditable="true"></div>
        <div class="draftpilot-tone-bar">
          <span class="draftpilot-tone-label">${_m('toneLabel')}</span>
          <button class="draftpilot-tone-btn" data-tone="formal">${_m('toneFormal')}</button>
          <button class="draftpilot-tone-btn" data-tone="friendly">${_m('toneFriendly')}</button>
          <button class="draftpilot-tone-btn" data-tone="concise">${_m('toneConcise')}</button>
        </div>
        <div class="draftpilot-draft-actions">
          <button class="regen-btn">${_m('regenBtn')}</button>
          <button class="copy-btn">${_m('copyBtn')}</button>
          <button class="insert-btn primary">${_m('insertBtn')}</button>
        </div>
      </div>
    `;

    // Intent selection
    popover.querySelectorAll('.draftpilot-intent-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('selected')) {
          btn.classList.remove('selected');
          this.selectedIntent = null;
        } else {
          popover
            .querySelectorAll('.draftpilot-intent-btn')
            .forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedIntent = btn.dataset.intent;
        }
      });
    });

    // Generate
    popover
      .querySelector('.draftpilot-generate-btn')
      .addEventListener('click', () => this.handleGenerate(popover));

    // Regen
    popover
      .querySelector('.regen-btn')
      .addEventListener('click', () => this.handleGenerate(popover));

    // Copy
    popover
      .querySelector('.copy-btn')
      .addEventListener('click', () => this.handleCopy(popover));

    // Insert
    popover
      .querySelector('.insert-btn')
      .addEventListener('click', () => this.handleInsert(popover));

    // Tone adjustment
    popover.querySelectorAll('.draftpilot-tone-btn').forEach((btn) => {
      btn.addEventListener('click', () =>
        this.handleToneAdjust(popover, btn.dataset.tone),
      );
    });

    // History
    popover
      .querySelector('.draftpilot-history-btn')
      .addEventListener('click', () => this.showHistory(popover));

    this.makeDraggable(popover);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener(
        'click',
        (this._outsideClickHandler = (e) => {
          if (
            !popover.contains(e.target) &&
            !e.target.classList.contains('draftpilot-btn')
          ) {
            this.close();
          }
        }),
      );
    }, 0);

    this.popoverEl = popover;
    return popover;
  },

  makeDraggable(popover) {
    const handle = popover.querySelector('.draftpilot-popover-title');
    if (!handle) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const movePopover = (clientX, clientY) => {
      const maxLeft = Math.max(8, window.innerWidth - popover.offsetWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - popover.offsetHeight - 8);
      const left = Math.min(Math.max(8, clientX - offsetX), maxLeft);
      const top = Math.min(Math.max(8, clientY - offsetY), maxTop);

      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
      popover.style.right = 'auto';
      popover.style.bottom = 'auto';
    };

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rect = popover.getBoundingClientRect();
      dragging = true;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      handle.setPointerCapture(e.pointerId);
      popover.classList.add('draftpilot-dragging');
      movePopover(e.clientX, e.clientY);
      e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      movePopover(e.clientX, e.clientY);
    });

    const stopDragging = (e) => {
      if (!dragging) return;
      dragging = false;
      handle.releasePointerCapture(e.pointerId);
      popover.classList.remove('draftpilot-dragging');
    };

    handle.addEventListener('pointerup', stopDragging);
    handle.addEventListener('pointercancel', stopDragging);
  },

  async handleGenerate(popover) {
    const input = popover.querySelector('.draftpilot-input').value.trim();
    const errorEl = popover.querySelector('.draftpilot-error');
    const draftSection = popover.querySelector('.draftpilot-draft-section');
    const draftEl = popover.querySelector('.draftpilot-draft');
    const genBtn = popover.querySelector('.draftpilot-generate-btn');

    if (!this.selectedIntent && !input) {
      errorEl.innerHTML = _m('errorNoIntent');
      errorEl.classList.remove('draftpilot-hidden');
      return;
    }

    errorEl.classList.add('draftpilot-hidden');
    genBtn.disabled = true;
    genBtn.textContent = _m('generating');
    draftSection.classList.add('draftpilot-hidden');

    // Show loading indicator
    let loadingEl = popover.querySelector('.draftpilot-loading');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'draftpilot-loading';
      genBtn.after(loadingEl);
    }
    loadingEl.textContent = _m('loadingDraft');
    loadingEl.classList.remove('draftpilot-hidden');

    try {
      const context = await DraftPilotContext.getContext();
      const intentLabel = this.selectedIntent
        ? _m(
            this.INTENTS.find((i) => i.value === this.selectedIntent)?.labelKey,
          )
        : null;

      const response = await chrome.runtime.sendMessage({
        type: 'generate',
        payload: {
          context,
          intent: intentLabel,
          intentValue: this.selectedIntent,
          userNote: input,
        },
      });

      if (response.error) throw new Error(response.error);

      draftEl.textContent = response.draft;
      draftSection.classList.remove('draftpilot-hidden');
    } catch (err) {
      errorEl.innerHTML = `${err.message || _m('generateFailed')}<span class="retry-link">${_m('retryLink')}</span>`;
      errorEl.classList.remove('draftpilot-hidden');
      errorEl
        .querySelector('.retry-link')
        ?.addEventListener('click', () => this.handleGenerate(popover));
    } finally {
      loadingEl.classList.add('draftpilot-hidden');
      genBtn.disabled = false;
      genBtn.textContent = _m('generateBtn');
    }
  },

  async showHistory(popover) {
    const response = await chrome.runtime.sendMessage({ type: 'get-history' });
    const history = response.history || [];
    if (!history.length) {
      alert(_m('noHistory'));
      return;
    }

    const draftEl = popover.querySelector('.draftpilot-draft');
    const draftSection = popover.querySelector('.draftpilot-draft-section');

    // Show a simple list overlay
    let listEl = popover.querySelector('.draftpilot-history-list');
    if (listEl) {
      listEl.remove();
      return;
    }

    listEl = document.createElement('div');
    listEl.className = 'draftpilot-history-list';
    listEl.innerHTML = history
      .map((item, i) => {
        const date = new Date(item.timestamp).toLocaleString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const preview =
          item.draft.slice(0, 60) + (item.draft.length > 60 ? '...' : '');
        return `<div class="draftpilot-history-item" data-idx="${i}"><span class="hist-date">${date}</span><span class="hist-text">${preview}</span></div>`;
      })
      .join('');
    popover.appendChild(listEl);

    listEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.draftpilot-history-item');
      if (!item) return;
      draftEl.textContent = history[item.dataset.idx].draft;
      draftSection.classList.remove('draftpilot-hidden');
      listEl.remove();
    });
  },

  async handleToneAdjust(popover, tone) {
    const draftEl = popover.querySelector('.draftpilot-draft');
    const errorEl = popover.querySelector('.draftpilot-error');
    const currentDraft = draftEl.textContent;
    if (!currentDraft) return;

    draftEl.textContent = _m('adjustingTone');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'adjust-tone',
        payload: { draft: currentDraft, tone },
      });
      if (response.error) throw new Error(response.error);
      draftEl.textContent = response.draft;
    } catch (err) {
      errorEl.textContent = err.message || _m('adjustFailed');
      errorEl.classList.remove('draftpilot-hidden');
      draftEl.textContent = currentDraft;
    }
  },

  handleCopy(popover) {
    const draft = popover.querySelector('.draftpilot-draft').textContent;
    navigator.clipboard.writeText(draft).then(() => {
      const btn = popover.querySelector('.copy-btn');
      const orig = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => (btn.textContent = orig), 1500);
    });
  },

  handleInsert(popover) {
    const draft = popover.querySelector('.draftpilot-draft').textContent;
    const target = window._draftpilotGetTarget
      ? window._draftpilotGetTarget()
      : null;
    if (target && draft) {
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // Use native setter to bypass React's controlled input
        const nativeSetter =
          Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          )?.set ||
          Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set;
        if (nativeSetter) {
          nativeSetter.call(target, draft);
        } else {
          target.value = draft;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Focus and select all existing content, then replace via execCommand
        // This works with Gmail, CKEditor, and other rich text editors
        target.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, draft);
        // Fallback if execCommand didn't work
        if (!target.textContent.trim()) {
          target.innerHTML = '';
          const p = document.createElement('p');
          p.textContent = draft;
          target.appendChild(p);
        }
        target.removeAttribute('placeholder');
        target.classList.remove('cke_htmlplaceholder');
        target.dispatchEvent(new InputEvent('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.close();
    }
  },

  close() {
    if (this.popoverEl) {
      this.popoverEl.remove();
      this.popoverEl = null;
    }
    this.selectedIntent = null;
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
      this._outsideClickHandler = null;
    }
  },

  toggle(anchor) {
    if (this.popoverEl) {
      this.close();
    } else {
      this._anchorEl = anchor;
      const popover = this.createPopover();
      document.body.appendChild(popover);
      const rect = anchor?.getBoundingClientRect
        ? anchor.getBoundingClientRect()
        : {
            top: anchor?.y ?? window.innerHeight / 2,
            bottom: anchor?.y ?? window.innerHeight / 2,
            right: anchor?.x ?? window.innerWidth - 8,
          };
      popover.style.position = 'fixed';
      // Position above the textarea, aligned to right
      const popoverHeight = 400; // approximate max
      const spaceAbove = rect.top;
      if (spaceAbove > popoverHeight) {
        popover.style.bottom = window.innerHeight - rect.top + 8 + 'px';
        popover.style.top = 'auto';
      } else {
        popover.style.top = rect.bottom + 8 + 'px';
        popover.style.bottom = 'auto';
      }
      popover.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
      popover.style.left = 'auto';
    }
  },
};
