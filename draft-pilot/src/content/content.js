// DraftPilot - Content Script (context menu + keyboard shortcut trigger)

/* global DraftPilotUI:readonly */

(function () {
  // Track the element that was right-clicked
  let lastActiveElement = null;
  let lastContextMenuPoint = null;

  function getEditableTarget(target) {
    const el = target?.closest?.('textarea, [contenteditable="true"]');
    if (!el || el.closest('.draftpilot-popover')) return null;
    return el;
  }

  function getSelectionPoint() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const clientRect =
      rect.width || rect.height ? rect : range.getClientRects()[0];
    if (!clientRect) return null;

    return { x: clientRect.right, y: clientRect.bottom };
  }

  // Save selection on mousedown (before focus change clears it)
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button === 2) {
        // right-click
        const sel = window.getSelection()?.toString().trim();
        window._draftpilotSavedSelection = sel || '';
        lastContextMenuPoint = { x: e.clientX, y: e.clientY };
      }
    },
    true,
  );

  document.addEventListener('contextmenu', (e) => {
    // Remember the element user right-clicked on
    const el = getEditableTarget(e.target);
    if (el) lastActiveElement = el;
  });

  // Also track focus for keyboard shortcut
  document.addEventListener('focusin', (e) => {
    const el = getEditableTarget(e.target);
    if (el) lastActiveElement = el;
  });

  function openDraft(selectionText = '') {
    if (selectionText) {
      window._draftpilotSavedSelection = selectionText.trim();
    } else {
      // Avoid reusing a previous selection when opened via shortcut or editable menu.
      window._draftpilotSavedSelection =
        window.getSelection()?.toString().trim() || '';
      // Context-menu coordinates are only valid for the click that captured them.
      lastContextMenuPoint = null;
    }

    if (!lastActiveElement) {
      const activeElement = getEditableTarget(document.activeElement);
      if (activeElement) lastActiveElement = activeElement;
    }
    if (!lastActiveElement && !window._draftpilotSavedSelection) {
      // Try to find any visible textarea
      lastActiveElement = getEditableTarget(
        document.querySelector('textarea:not([hidden])'),
      );
    }
    if (!lastActiveElement && !window._draftpilotSavedSelection) return;

    // If the script was injected after right-click, fall back to the selection range.
    const selectionAnchor =
      lastContextMenuPoint || getSelectionPoint() || lastActiveElement;
    const anchor = window._draftpilotSavedSelection
      ? selectionAnchor
      : lastActiveElement;
    DraftPilotUI.toggle(anchor);
  }

  // Listen for messages from background (context menu click or keyboard shortcut)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ping') {
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === 'open-draft') {
      openDraft(msg.selectionText || '');
      sendResponse({ ok: true });
    }
  });

  // Expose for ui.js insert
  window._draftpilotGetTarget = () => lastActiveElement;
})();
