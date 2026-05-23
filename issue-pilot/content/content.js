// IssuePilot - Main Content Script (injection logic)

(function () {
  const BUTTON_CLASS = 'issuepilot-btn';

  function findTextarea() {
    return document.querySelector(
      'textarea.prc-Textarea-TextArea-snlco, textarea#new_comment_field, textarea.js-comment-field, textarea[name="comment[body]"]'
    );
  }

  function injectButton(container) {
    if (container.querySelector(`.${BUTTON_CLASS}`)) return;
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.type = 'button';
    btn.textContent = '✨ Draft';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      IssuePilotUI.toggle(btn);
    });
    container.appendChild(btn);
  }

  function findAndInject() {
    // Strategy 1: New GitHub (Primer React) - find CommentBox header's tablist
    document.querySelectorAll('[class*="CommentBox"], [class*="MarkdownEditor"]').forEach(box => {
      const tabList = box.querySelector('[role="tablist"]');
      if (tabList) injectButton(tabList);
    });

    // Strategy 2: Classic GitHub - markdown-toolbar
    document.querySelectorAll('markdown-toolbar').forEach(injectButton);

    // Strategy 3: Classic GitHub - tab nav in comment forms
    document.querySelectorAll('.js-previewable-comment-form .tabnav-tabs').forEach(injectButton);
  }

  window._issuepilotFindTextarea = findTextarea;

  // Initial + delayed injection
  findAndInject();
  setTimeout(findAndInject, 1000);
  setTimeout(findAndInject, 3000);

  // MutationObserver for dynamic DOM
  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(findAndInject, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // GitHub Turbo navigation
  document.addEventListener('turbo:load', findAndInject);
  document.addEventListener('turbo:render', findAndInject);

  // Keyboard shortcut
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'open-draft') {
      const btn = document.querySelector(`.${BUTTON_CLASS}`);
      if (btn) IssuePilotUI.toggle(btn);
    }
  });
})();
