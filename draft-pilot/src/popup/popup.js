// DraftPilot - Popup Settings
import { DraftPilotStorage } from '../shared/storage.js';

const $ = (id) => document.getElementById(id);
const _m = (key) => chrome.i18n.getMessage(key);

$('version').textContent = chrome.runtime.getManifest().version;

// Apply i18n to DOM
document.querySelectorAll('[data-i18n]').forEach((el) => {
  el.textContent = _m(el.dataset.i18n);
});
document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
  el.placeholder = _m(el.dataset.i18nPlaceholder);
});

// Load saved settings
DraftPilotStorage.getSettings().then((s) => {
  $('apiKey').value = s.apiKey;
  $('model').value = s.model;
  $('tone').value = s.defaultTone;
  $('baseUrl').value = s.baseUrl;
  $('ghToken').value = s.ghToken;
});

function getOriginPattern(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('invalid protocol');
  }
  return `${url.protocol}//${url.hostname}/*`;
}

function requestOrigins(origins) {
  return new Promise((resolve) => {
    chrome.permissions.request({ origins }, resolve);
  });
}

let statusTimer = null;

function showStatus(messageKey) {
  if (statusTimer) clearTimeout(statusTimer);
  $('status').textContent = _m(messageKey);
  statusTimer = setTimeout(() => {
    $('status').textContent = '';
    statusTimer = null;
  }, 2500);
}

// Save
$('save').addEventListener('click', async () => {
  const baseUrl = $('baseUrl').value.trim();
  const ghToken = $('ghToken').value.trim();

  let origins;
  try {
    origins = [getOriginPattern(baseUrl)];
    if (ghToken) origins.push('https://api.github.com/*');
    origins = [...new Set(origins)];
  } catch (_) {
    showStatus('invalidBaseUrl');
    return;
  }

  const granted = await requestOrigins(origins);
  if (!granted) {
    showStatus('permissionDenied');
    return;
  }

  chrome.storage.local.set(
    {
      apiKey: $('apiKey').value,
      model: $('model').value,
      defaultTone: $('tone').value,
      baseUrl,
      ghToken,
    },
    () => showStatus('saved'),
  );
});

function togglePassword(id) {
  const input = $(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Toggle key visibility
$('toggleKey').addEventListener('click', () => togglePassword('apiKey'));
$('toggleGhToken').addEventListener('click', () => togglePassword('ghToken'));
