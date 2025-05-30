'use strict';

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

export class Database {
  static #keyEngine = 'engine';
  static #instance = null; // Private static field to hold the instance

  constructor() {
    if (Database.#instance) {
      throw new Error('Database can only be instantiated once.');
    }
    Database.#instance = this;
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new Database();
    }
    return this.#instance;
  }

  async getEngine() {
    const opt = await chrome.storage.sync.get({
      [Database.#keyEngine]: 'local',
    });
    return opt[Database.#keyEngine];
  }

  async setEngine(engine) {
    return await chrome.storage.sync.set({ [Database.#keyEngine]: engine });
  }

  async getStorage() {
    const engine = await this.getEngine();
    return chrome.storage[engine];
  }

  async remove(key) {
    const storage = await this.getStorage();
    return await storage.remove(key);
  }

  async addText(text, url, createdAt = Date.now(), id) {
    const storage = await this.getStorage();
    const engine = await this.getEngine();
    switch (engine) {
      case 'local': {
        const uuid = id || crypto.randomUUID();
        await storage.set({
          [uuid]: { text, url, createdAt },
        });
        break;
      }
      case 'sync': {
        const id = id || `id-${createdAt}`;
        await storage.set({ [id]: [text, url] });
        break;
      }
      default:
        throw new Error(`Unknown storage engine: ${engine}`);
    }
    return engine;
  }

  async getTexts() {
    const engine = await this.getEngine();
    switch (engine) {
      // { 'uuid': { text, url, createdAt } }
      case 'local': {
        const allTexts = await chrome.storage.local.get();
        return Object.entries(allTexts).map(([uuid, value]) => {
          const { text, url, createdAt } = value;
          return [uuid, text, url, createdAt];
        });
      }
      // [ { id-{createdAt}:  [text, url] } ]
      case 'sync': {
        const allTexts = await chrome.storage.sync.get();
        const rows = [];
        for (const entry of Object.entries(allTexts)) {
          const id = entry[0];
          if (!id.startsWith('id-')) {
            continue;
          }
          const [text, url] = entry[1];
          const createdAt = parseInt(removePrefix(id, 'id-'), 10);
          rows.push([id, text, url, createdAt]);
        }
        return rows;
      }
      default:
        throw new Error(`Unknown storage engine: ${engine}`);
    }
  }

  async clear() {
    const storage = await this.getStorage();
    return await storage.clear(null);
  }

  async getAll() {
    const storage = await this.getStorage();
    return await storage.get(null);
  }

  async getBytesInUse() {
    const engine = await this.getEngine();
    // Only firefox local storage need this
    if (isFirefox && engine === 'local') {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1385832#c20
      return new TextEncoder().encode(
        Object.entries(await this.getAll())
          .map(([key, value]) => key + JSON.stringify(value))
          .join(''),
      ).length;
    }

    const storage = await this.getStorage();
    return await storage.getBytesInUse(null);
  }
}

function removePrefix(str, prefix) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return str; // Return the original string if it doesn't start with the prefix
}
