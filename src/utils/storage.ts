import { Platform } from 'react-native';

const memoryCache: Record<string, string> = {};

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(key);
        }
      } catch {}
    }
    return memoryCache[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryCache[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
    }
  },

  async removeItem(key: string): Promise<void> {
    delete memoryCache[key];
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
    }
  },
};
