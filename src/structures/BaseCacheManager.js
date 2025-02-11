class BaseCacheManager {
  constructor() {
    this._items = new Map();
  }

  _add(id, data) {
    this._items.set(id, data);
  }

  _remove(id, data) {
    this._items.delete(id, data);
  }

  _has(id) {
    return this._items.has(id);
  }

  _get(id) {
    return this._items.get(id);
  }
}

module.exports = BaseCacheManager;
