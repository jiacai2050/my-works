// IssuePilot - Popup Settings

const $ = (id) => document.getElementById(id);

// Load saved settings
chrome.storage.local.get(
  ['provider', 'apiKey', 'model', 'defaultTone', 'baseUrl'],
  (data) => {
    if (data.provider) $('provider').value = data.provider;
    if (data.apiKey) $('apiKey').value = data.apiKey;
    if (data.model) $('model').value = data.model;
    if (data.defaultTone) $('tone').value = data.defaultTone;
    if (data.baseUrl) $('baseUrl').value = data.baseUrl;
  },
);

// Save
$('save').addEventListener('click', () => {
  chrome.storage.local.set(
    {
      provider: $('provider').value,
      apiKey: $('apiKey').value,
      model: $('model').value,
      defaultTone: $('tone').value,
      baseUrl: $('baseUrl').value.trim(),
    },
    () => {
      $('status').textContent = '✓ 已保存';
      setTimeout(() => ($('status').textContent = ''), 2000);
    },
  );
});

// Toggle key visibility
$('toggleKey').addEventListener('click', () => {
  const input = $('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
});
