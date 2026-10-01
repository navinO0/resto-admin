import { Platform } from 'react-native';
import { backgroundAlertService } from '../services/backgroundAlertService';

const memoryCache: Record<string, string> = {};

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          const val = localStorage.getItem(key);
          if (val !== null) memoryCache[key] = val;
          return val;
        }
      } catch {}
    } else if (Platform.OS === 'android') {
      try {
        const val = await backgroundAlertService.getStorageItem(key);
        if (val !== null && val !== undefined) {
          memoryCache[key] = val;
          return val;
        }
      } catch (err) {
        console.warn('[Storage] Native getItem error for key:', key, err);
      }
    }
    return memoryCache[key] ?? null;

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryCache[key] = value;

    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
    } else if (Platform.OS === 'android') {
      try {
        await backgroundAlertService.setStorageItem(key, value);
      } catch (err) {
        console.warn('[Storage] Native setItem error for key:', key, err);
      }
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
    } else if (Platform.OS === 'android') {
      try {
        await backgroundAlertService.removeStorageItem(key);
      } catch (err) {
        console.warn('[Storage] Native removeItem error for key:', key, err);
      }
    }
  },
};
