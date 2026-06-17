// DraftPilot - Storage Helper

export const DraftPilotStorage = {
  async getSettings() {
    const s = await chrome.storage.local.get([
      'apiKey',
      'model',
      'defaultTone',
      'baseUrl',
      'ghToken',
    ]);
    return {
      apiKey: s.apiKey || '',
      model: s.model || '',
      defaultTone: s.defaultTone || '',
      baseUrl: s.baseUrl || '',
      ghToken: s.ghToken || '',
    };
  },

  async getDraftHistory() {
    const { draftHistory = [] } =
      await chrome.storage.local.get('draftHistory');
    return draftHistory;
  },

  async saveDraft(draft, title) {
    const history = await this.getDraftHistory();
    history.unshift({ draft, title: title || '', timestamp: Date.now() });
    if (history.length > 20) history.length = 20;
    await chrome.storage.local.set({ draftHistory: history });
  },
};
