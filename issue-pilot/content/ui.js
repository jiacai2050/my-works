// IssuePilot - UI Popover Rendering

const IssuePilotUI = {
  INTENTS: [
    { emoji: '👍', label: '赞同', value: 'agree' },
    { emoji: '🤔', label: '有疑问', value: 'question' },
    { emoji: '❌', label: '反对', value: 'disagree' },
    { emoji: '💡', label: '有建议', value: 'suggestion' },
    { emoji: '🐛', label: '补充信息', value: 'info' },
    { emoji: '🙏', label: '求助', value: 'help' },
  ],

  selectedIntent: null,
  popoverEl: null,

  createPopover() {
    const popover = document.createElement('div');
    popover.className = 'issuepilot-popover';
    popover.innerHTML = `
      <div class="issuepilot-popover-title">你想表达什么？</div>
      <div class="issuepilot-intents">
        ${this.INTENTS.map((i) => `<button class="issuepilot-intent-btn" data-intent="${i.value}">${i.emoji} ${i.label}</button>`).join('')}
      </div>
      <textarea class="issuepilot-input" placeholder="或补充说明（中文/英文均可）"></textarea>
      <div class="issuepilot-btn-row">
        <button class="issuepilot-generate-btn">生成草稿</button>
        <button class="issuepilot-history-btn" title="历史记录">📜</button>
      </div>
      <div class="issuepilot-error issuepilot-hidden"></div>
      <div class="issuepilot-draft-section issuepilot-hidden">
        <div class="issuepilot-draft" contenteditable="true"></div>
        <div class="issuepilot-tone-bar">
          <span class="issuepilot-tone-label">语气:</span>
          <button class="issuepilot-tone-btn" data-tone="formal">🎩 正式</button>
          <button class="issuepilot-tone-btn" data-tone="friendly">😊 友好</button>
          <button class="issuepilot-tone-btn" data-tone="concise">⚡ 简洁</button>
        </div>
        <div class="issuepilot-draft-actions">
          <button class="regen-btn">🔄 重新生成</button>
          <button class="insert-btn primary">📋 插入输入框</button>
        </div>
      </div>
    `;

    // Intent selection
    popover.querySelectorAll('.issuepilot-intent-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        popover
          .querySelectorAll('.issuepilot-intent-btn')
          .forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedIntent = btn.dataset.intent;
      });
    });

    // Generate
    popover
      .querySelector('.issuepilot-generate-btn')
      .addEventListener('click', () => this.handleGenerate(popover));

    // Regen
    popover
      .querySelector('.regen-btn')
      .addEventListener('click', () => this.handleGenerate(popover));

    // Insert
    popover
      .querySelector('.insert-btn')
      .addEventListener('click', () => this.handleInsert(popover));

    // Tone adjustment
    popover.querySelectorAll('.issuepilot-tone-btn').forEach((btn) => {
      btn.addEventListener('click', () =>
        this.handleToneAdjust(popover, btn.dataset.tone),
      );
    });

    // History
    popover
      .querySelector('.issuepilot-history-btn')
      .addEventListener('click', () => this.showHistory(popover));

    // Close on outside click
    setTimeout(() => {
      document.addEventListener(
        'click',
        (this._outsideClickHandler = (e) => {
          if (
            !popover.contains(e.target) &&
            !e.target.classList.contains('issuepilot-btn')
          ) {
            this.close();
          }
        }),
      );
    }, 0);

    this.popoverEl = popover;
    return popover;
  },

  async handleGenerate(popover) {
    const input = popover.querySelector('.issuepilot-input').value.trim();
    const errorEl = popover.querySelector('.issuepilot-error');
    const draftSection = popover.querySelector('.issuepilot-draft-section');
    const draftEl = popover.querySelector('.issuepilot-draft');
    const genBtn = popover.querySelector('.issuepilot-generate-btn');

    if (!this.selectedIntent && !input) {
      errorEl.innerHTML = '请选择一个意图或输入说明';
      errorEl.classList.remove('issuepilot-hidden');
      return;
    }

    errorEl.classList.add('issuepilot-hidden');
    genBtn.disabled = true;
    genBtn.textContent = '⏳ 生成中...';
    draftSection.classList.add('issuepilot-hidden');

    // Show loading indicator
    let loadingEl = popover.querySelector('.issuepilot-loading');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'issuepilot-loading';
      genBtn.after(loadingEl);
    }
    loadingEl.textContent = '正在生成草稿...';
    loadingEl.classList.remove('issuepilot-hidden');

    try {
      const context = await IssuePilotGitHub.getContext();
      const intentLabel = this.selectedIntent
        ? this.INTENTS.find((i) => i.value === this.selectedIntent)?.label
        : null;

      const response = await chrome.runtime.sendMessage({
        type: 'generate',
        payload: { context, intent: intentLabel, userNote: input },
      });

      if (response.error) throw new Error(response.error);

      draftEl.textContent = response.draft;
      draftSection.classList.remove('issuepilot-hidden');
    } catch (err) {
      errorEl.innerHTML = `${err.message || '生成失败'}<span class="retry-link">重试</span>`;
      errorEl.classList.remove('issuepilot-hidden');
      errorEl
        .querySelector('.retry-link')
        ?.addEventListener('click', () => this.handleGenerate(popover));
    } finally {
      loadingEl.classList.add('issuepilot-hidden');
      genBtn.disabled = false;
      genBtn.textContent = '生成草稿';
    }
  },

  async showHistory(popover) {
    const response = await chrome.runtime.sendMessage({ type: 'get-history' });
    const history = response.history || [];
    if (!history.length) {
      alert('暂无历史记录');
      return;
    }

    const draftEl = popover.querySelector('.issuepilot-draft');
    const draftSection = popover.querySelector('.issuepilot-draft-section');

    // Show a simple list overlay
    let listEl = popover.querySelector('.issuepilot-history-list');
    if (listEl) {
      listEl.remove();
      return;
    }

    listEl = document.createElement('div');
    listEl.className = 'issuepilot-history-list';
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
        return `<div class="issuepilot-history-item" data-idx="${i}"><span class="hist-date">${date}</span><span class="hist-text">${preview}</span></div>`;
      })
      .join('');
    popover.appendChild(listEl);

    listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.issuepilot-history-item');
      if (!item) return;
      draftEl.textContent = history[item.dataset.idx].draft;
      draftSection.classList.remove('issuepilot-hidden');
      listEl.remove();
    });
  },

  async handleToneAdjust(popover, tone) {
    const draftEl = popover.querySelector('.issuepilot-draft');
    const errorEl = popover.querySelector('.issuepilot-error');
    const currentDraft = draftEl.textContent;
    if (!currentDraft) return;

    draftEl.textContent = '调整语气中...';
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'adjust-tone',
        payload: { draft: currentDraft, tone },
      });
      if (response.error) throw new Error(response.error);
      draftEl.textContent = response.draft;
    } catch (err) {
      errorEl.textContent = err.message || '调整失败';
      errorEl.classList.remove('issuepilot-hidden');
      draftEl.textContent = currentDraft;
    }
  },

  handleInsert(popover) {
    const draft = popover.querySelector('.issuepilot-draft').textContent;
    const target = window._issuepilotGetTarget
      ? window._issuepilotGetTarget()
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
        target.textContent = draft;
        target.dispatchEvent(new InputEvent('input', { bubbles: true }));
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

  toggle(anchorEl) {
    if (this.popoverEl) {
      this.close();
    } else {
      this._anchorEl = anchorEl;
      const popover = this.createPopover();
      document.body.appendChild(popover);
      const rect = anchorEl.getBoundingClientRect();
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
