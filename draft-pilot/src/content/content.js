// DraftPilot - Content Script (context menu + keyboard shortcut trigger)

/* global DraftPilotUI:readonly */

(function () {
  // Track the element that was right-clicked
  let lastActiveElement = null;

  // Save selection on mousedown (before focus change clears it)
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button === 2) {
        // right-click
        const sel = window.getSelection()?.toString().trim();
        window._draftpilotSavedSelection = sel || '';
      }
    },
    true,
  );

  document.addEventListener('contextmenu', (e) => {
    // Remember the element user right-clicked on
    const el = e.target.closest('textarea, [contenteditable="true"]');
    if (el) lastActiveElement = el;
  });

  // Also track focus for keyboard shortcut
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('textarea, [contenteditable="true"]');
    if (el) lastActiveElement = el;
  });

  function openDraft() {
    if (!lastActiveElement) {
      // Try to find any visible textarea
      lastActiveElement = document.querySelector('textarea:not([hidden])');
    }
    if (!lastActiveElement) return;

    DraftPilotUI.toggle(lastActiveElement);
  }

  // Listen for messages from background (context menu click or keyboard shortcut)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'open-draft') openDraft();
  });

  // Expose for ui.js insert
  window._draftpilotGetTarget = () => lastActiveElement;
})();
