'use strict';

const ADD_TEXT_ID = 'add-text';
const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

createMenus();

function createMenus() {
  // Firefox support more contexts
  const ctx = isFirefox ? ['all', 'bookmark', 'tab'] : ['all'];

  chrome.contextMenus.create({
    id: ADD_TEXT_ID,
    title: 'Add to Text Saver',
    type: 'normal',
    contexts: ctx,
  });
}

async function saveSelection(item, tab) {
  let { pageUrl, srcUrl, selectionText } = item;

  // when selection is null, fallback to others.
  if (!selectionText) {
    selectionText = srcUrl || tab.title || pageUrl;
  }

  const id = `id-${Date.now()}`;
  const row = {
    [id]: {
      url: pageUrl,
      text: selectionText,
    },
  };
  await chrome.storage.sync.set(row);
  if (await getNotification()) {
    await chrome.notifications.create(null, {
      type: 'basic',
      title: pageUrl,
      contextMessage: 'Saved',
      message: selectionText,
      iconUrl: 'logo.png',
    });
  }
}

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  try {
    saveSelection(item, tab);
  } catch (err) {
    console.error('Error in context menu onclick:', err);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (errorMessage) => {
        alert('Error occurred when save selection: ' + errorMessage);
      },
      args: [err.message],
    });
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});

// Firefox doesn't support module background.js directly
// So this fn is duplicated with Options
async function getNotification() {
  const key = 'enable-notification';
  const opt = await chrome.storage.sync.get({ [key]: false });
  return opt[key];
}
