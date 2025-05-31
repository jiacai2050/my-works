'use strict';

/* eslint-disable no-unused-vars */

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

class DB {
  constructor(storage) {
    this.storage = storage;
  }

  async get(key) {
    const value = await this.storage.get(key);
    if (value) {
      return value[key];
    }
  }

  async set(key, value) {
    try {
      // [key] is Computed Property Names in ES6, we can store dynamic key with it!
      // https://stackoverflow.com/a/40287132/2163429
      return await this.storage.set({ [key]: value });
    } catch (e) {
      console.error(`DB set failed, key:${key}, value:${value}, err:${e}`);
    }
  }

  // A single key or a list of keys for items to remove
  async remove(keys) {
    return await this.storage.remove(keys);
  }

  // Mainly for testing
  async clear() {
    return await this.storage.clear(null);
  }
  async dump() {
    return await this.storage.get(null);
  }

  async getBytesInUse() {
    if (isFirefox) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1385832#c20
      return new TextEncoder().encode(
        Object.entries(await this.storage.get())
          .map(([key, value]) => key + JSON.stringify(value))
          .join(''),
      ).length;
    }

    return await this.storage.getBytesInUse(null);
  }
}

const metaCache = isFirefox
  ? new DB(chrome.storage.local)
  : new DB(chrome.storage.session);
const settingStorage = new DB(chrome.storage.sync);

async function getPosition() {
  return (await settingStorage.get('position')) || 'bottom-right';
}

async function setPosition(pos) {
  await settingStorage.set('position', pos);
}

async function getMaxLength() {
  return (await settingStorage.get('max-length')) || 350;
}

async function setMaxLength(len) {
  await settingStorage.set('max-length', len);
}

async function getDomainEncoding() {
  return (await settingStorage.get('domain-encoding-arr')) || [];
}

async function setDomainEncoding(v) {
  await settingStorage.set('domain-encoding-arr', v);
}

function humanSize(size) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (i < units.length - 1 && size >= 1024) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}
