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
    const enablePopup = await db.getPopup();
    if (!enablePopup) {
      return;
    }
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
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = isDarkMode
    ? {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(148, 163, 184, 0.24)',
        shadow: '0 18px 45px rgba(0, 0, 0, 0.42), 0 4px 12px rgba(0, 0, 0, 0.3)',
        text: '#f8fafc',
        title: '#86efac',
        message: '#cbd5e1',
      }
    : {
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(148, 163, 184, 0.28)',
        shadow: '0 18px 45px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)',
        text: '#0f172a',
        title: '#15803d',
        message: '#475569',
      };

  popupContainer.id = 'ext-text-saver-popup';
  popupContainer.style.position = 'fixed';
  popupContainer.style.top = '18px';
  popupContainer.style.right = '18px';
  popupContainer.style.width = '320px';
  popupContainer.style.boxSizing = 'border-box';
  popupContainer.style.padding = '16px 18px';
  popupContainer.style.zIndex = '2147483647';
  popupContainer.style.background = colors.background;
  popupContainer.style.border = colors.border;
  popupContainer.style.borderLeft = '4px solid #22c55e';
  popupContainer.style.borderRadius = '12px';
  popupContainer.style.boxShadow = colors.shadow;
  popupContainer.style.color = colors.text;
  popupContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  popupContainer.style.animation = 'extTextSaverPopupIn 180ms ease-out';

  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes extTextSaverPopupIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  popupContainer.appendChild(styleElement);

  const titleElement = document.createElement('header');
  titleElement.textContent = `✓ Saved to ${engine}`;
  titleElement.style.margin = '0 0 8px';
  titleElement.style.fontSize = '14px';
  titleElement.style.fontWeight = '700';
  titleElement.style.lineHeight = '1.4';
  titleElement.style.color = colors.title;
  popupContainer.appendChild(titleElement);

  const message = document.createElement('p');
  message.textContent = text;
  message.style.margin = '0';
  message.style.fontSize = '13px';
  message.style.lineHeight = '1.5';
  message.style.color = colors.message;
  message.style.display = '-webkit-box';
  message.style.webkitLineClamp = '4';
  message.style.webkitBoxOrient = 'vertical';
  message.style.overflow = 'hidden';
  popupContainer.appendChild(message);

  document.body.appendChild(popupContainer);

  setTimeout(() => {
    if (document.body.contains(popupContainer)) {
      document.body.removeChild(popupContainer);
    }
  }, 4000);
}
