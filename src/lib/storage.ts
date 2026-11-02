// Web localStorage adapter with the exact same async signature as AsyncStorage

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      for (const k of keys) {
        localStorage.removeItem(k);
      }
    } catch (e) {
      console.warn('Storage multiRemove error:', e);
    }
  },
};

export default storage;
