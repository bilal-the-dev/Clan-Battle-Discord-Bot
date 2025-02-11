const BaseCacheManager = require("./baseCacheManager");

class ClanStateManager extends BaseCacheManager {
  constructor() {
    super();
  }

  setState(interactionId, clanData) {
    super._add(interactionId, clanData);
  }

  removeState(interactionId) {
    super._remove(interactionId);
  }

  getState(interactionId) {
    return super._get(interactionId);
  }
}

module.exports = ClanStateManager;
