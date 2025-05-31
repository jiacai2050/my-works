'use strict';

import { Database } from './module.js';
const db = Database.getInstance();

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
  let { pageUrl, srcUrl, selectionText, linkUrl } = item;
  // console.table(item);

  // when selection is null, fallback to others.
  if (!selectionText) {
    selectionText = srcUrl || tab.title || pageUrl;
  }

  const url = linkUrl || pageUrl;
  const engine = await db.addText(selectionText, url);
  return [selectionText, engine];
}

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  try {
    const [text, engine] = await saveSelection(item, tab);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: createAndShowPopup,
      args: [text, engine],
    });
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

function createAndShowPopup(text, engine) {
  // Check if the popup already exists
  const existingPopup = document.getElementById('ext-text-saver-popup');
  if (existingPopup) {
    return;
  }

  const popupContainer = document.createElement('div');
  popupContainer.style.position = 'fixed';
  popupContainer.style.top = '10px';
  popupContainer.style.right = '10px';
  popupContainer.style.width = '300px';
  popupContainer.style.border = '1px solid black';
  popupContainer.style.padding = '20px';
  popupContainer.style.zIndex = '9999';
  popupContainer.style.boxShadow = '2px 2px 10px rgba(0,0,0,0.3)';
  popupContainer.style.backgroundColor = '#F6F8FA';
  popupContainer.style.borderRadius = '5px';

  const titleElement = document.createElement('header');
  titleElement.textContent = `Saved to ${engine}`;
  titleElement.style.textAlign = 'center';
  titleElement.style.backgroundColor = '#f5f7ff';
  titleElement.style.fontSize = '1.2rem';
  popupContainer.appendChild(titleElement);

  const message = document.createElement('p');
  message.textContent = text;
  popupContainer.appendChild(message);

  document.body.appendChild(popupContainer);

  setTimeout(() => {
    if (document.body.contains(popupContainer)) {
      document.body.removeChild(popupContainer);
    }
  }, 4000);
}
