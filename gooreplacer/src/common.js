'use strict';

// Chrome storage.sync has a per-item quota of 8KB (8192 bytes) and a total quota per extension.
// See: https://developer.chrome.com/docs/extensions/reference/storage/#property-sync
// To avoid exceeding the per-item limit, we store rules in up to 5 separate keys, each holding up to 7KB (7000 characters).
// This provides a safety margin below the 8KB limit and helps prevent quota errors.
const MAX_KEYS = 5; // Use up to 5 keys for storing rules (rules, rules2, ..., rules5)
const CHUNK_SIZE = 8000; // Each key stores up to 8KB to stay under the 8KB per-item limit

export async function getDynamicRules() {
  const ruleKeys = Array.from({ length: MAX_KEYS }, (_, i) =>
    i === 0 ? 'rules' : `rules${i + 1}`,
  );
  const defaults = Object.fromEntries(ruleKeys.map((key) => [key, '']));
  const data = await chrome.storage.sync.get(defaults);
  return ruleKeys.map((key) => data[key]).join('');
}

export async function setDynamicRules(value) {
  if (value.length > MAX_KEYS * CHUNK_SIZE) {
    throw new Error(
      `Rule length is too large, max: ${MAX_KEYS * CHUNK_SIZE}, current: ${value.length}`,
    );
  }

  const parts = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    parts.push(value.slice(i, i + CHUNK_SIZE));
  }

  // Construct new key-value pairs, reset to empty string when parts[i] is null.
  const obj = Array.from({ length: MAX_KEYS }).reduce((acc, _, i) => {
    const key = i === 0 ? 'rules' : `rules${i + 1}`;
    acc[key] = parts[i] || '';
    return acc;
  }, {});

  await chrome.storage.sync.set(obj);
}
