import uuid from 'uuid';
import emitter from 'event-emitter';
import localforage from 'localforage';

export default class SynchronizedStorage {
  constructor({
    storageKey,
  }) {
    if (!storageKey) {
      throw Error('SynchronizedStorage must be created with a storage key');
    }
    this._storageKey = storageKey;
    this._id = uuid.v4();
    localforage.config({ name: this._storageKey });
    this._localStorage = localforage.createInstance({
      name: this._storageKey,
    });
  }

  async getLocalStorageKeys() {
    const keys = await this._localStorage.keys();
    return keys;
  }

  async getData() {
    const output = {};
    const keys = await this.getLocalStorageKeys();
    const promises = keys.map(key => this.getItem(key).then(data => { output[key] = data; }));
    await Promise.all(promises);
    return output;
  }

  async getItem(key) {
    const originalData = await this._localStorage.getItem(key);
    try {
      const {
        value,
      } = JSON.parse(originalData);
      return value;
    } catch (error) {
      return undefined;
    }
  }

  async setItem(key, value) {
    await this._localStorage.setItem(
      key,
      JSON.stringify({
        value,
        setter: this.id,
      }),
    );
  }

  async removeItem(key) {
    await this._localStorage.removeItem(key);
  }

  destroy() {}

  get id() {
    return this._id;
  }
}

emitter(SynchronizedStorage.prototype);
