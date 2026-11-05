import { Preferences } from '@capacitor/preferences';

class DeviceStorageService {
  /**
   * Set a key-value pair across both Capacitor Native Preferences (SharedPreferences on Android)
   * and browser localStorage for resilient cross-update retention.
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {}

    try {
      await Preferences.set({ key, value });
    } catch (err) {
      console.warn('Native preferences set failed:', err);
    }
  }

  /**
   * Get value prioritizing Native Preferences, falling back to localStorage.
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      const res = await Preferences.get({ key });
      if (res && res.value !== null && res.value !== undefined) {
        // Self-heal localStorage
        try {
          localStorage.setItem(key, res.value);
        } catch {}
        return res.value;
      }
    } catch (err) {
      console.warn('Native preferences get failed:', err);
    }

    try {
      const localVal = localStorage.getItem(key);
      if (localVal) {
        // Self-heal native preferences
        Preferences.set({ key, value: localVal }).catch(() => {});
        return localVal;
      }
    } catch {}

    return null;
  }

  /**
   * Synchronous get from localStorage as fast initial render cache.
   */
  public getItemSync(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {}

    try {
      await Preferences.remove({ key });
    } catch {}
  }
}

export const deviceStorage = new DeviceStorageService();

