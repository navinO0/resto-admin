import { NativeModules, Platform, DeviceEventEmitter, PermissionsAndroid } from 'react-native';

const { BackgroundAlertModule } = NativeModules;

class BackgroundAlertService {
  /**
   * Wakes up the screen from sleep/lock state and brings the app to the front.
   * Safe to call on all platforms (no-op on non-Android).
   */
  wakeUpScreen() {
    if (Platform.OS === 'android' && BackgroundAlertModule?.wakeUpScreen) {
      try {
        BackgroundAlertModule.wakeUpScreen();
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to wake screen:', err);
      }
    }
  }

  /**
   * Shows a high-priority system notification with sound and vibration.
   */
  showOrderNotification(id: number, title: string, message: string, sessionId: string) {
    if (Platform.OS === 'android' && BackgroundAlertModule?.showOrderNotification) {
      try {
        BackgroundAlertModule.showOrderNotification(id, title, message, sessionId);
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to show order notification:', err);
      }
    }
  }

  /**
   * Cancels a specific notification by ID.
   */
  cancelNotification(id: number) {
    if (Platform.OS === 'android' && BackgroundAlertModule?.cancelNotification) {
      try {
        BackgroundAlertModule.cancelNotification(id);
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to cancel notification:', err);
      }
    }
  }

  /**
   * Retrieves the sessionId if the app was launched by tapping a notification.
   */
  async getInitialSessionId(): Promise<string | null> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.getInitialSessionId) {
      try {
        return await BackgroundAlertModule.getInitialSessionId();
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to get initial session ID:', err);
        return null;
      }
    }
    return null;
  }

  /**
   * Registers a listener for when a notification is tapped while the app is in background or foreground.
   */
  onNotificationOpenOrder(callback: (sessionId: string) => void): () => void {
    const subscription = DeviceEventEmitter.addListener(
      'onNotificationOpenOrder',
      (event: { sessionId?: string }) => {
        if (event?.sessionId) {
          callback(event.sessionId);
        }
      }
    );
    return () => subscription.remove();
  }

  /**
   * Requests POST_NOTIFICATIONS permission on Android 13+ (API 33+).
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[BackgroundAlertService] Error requesting notification permission:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Checks whether the app has been exempted from battery optimization.
   */
  async isBatteryOptimizationIgnored(): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.isBatteryOptimizationIgnored) {
      try {
        return await BackgroundAlertModule.isBatteryOptimizationIgnored();
      } catch (err) {
        console.warn('[BackgroundAlertService] Error checking battery optimization:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Prompts the system dialog asking the user to exempt this app from battery optimizations.
   * This ensures Android Doze mode does not pause the socket connection in background.
   */
  requestBatteryOptimizationExemption() {
    if (Platform.OS === 'android' && BackgroundAlertModule?.requestBatteryOptimizationExemption) {
      try {
        BackgroundAlertModule.requestBatteryOptimizationExemption();
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to request battery exemption:', err);
      }
    }
  }

  /**
   * Starts the sticky Android Foreground Service to monitor orders
   * even when the app is swiped away from Recents.
   */
  startForegroundService() {
    if (Platform.OS === 'android' && BackgroundAlertModule?.startForegroundService) {
      try {
        BackgroundAlertModule.startForegroundService();
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to start foreground service:', err);
      }
    }
  }

  /**
   * Stops the Android Foreground Service (e.g. on staff logout).
   */
  stopForegroundService() {
    if (Platform.OS === 'android' && BackgroundAlertModule?.stopForegroundService) {
      try {
        BackgroundAlertModule.stopForegroundService();
      } catch (err) {
        console.warn('[BackgroundAlertService] Failed to stop foreground service:', err);
      }
    }
  }

  /**
   * Native SharedPreferences persistent storage bridge.
   */
  async getStorageItem(key: string): Promise<string | null> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.getStorageItem) {
      try {
        return await BackgroundAlertModule.getStorageItem(key);
      } catch (err) {
        console.warn('[BackgroundAlertService] getStorageItem failed:', err);
        return null;
      }
    }
    return null;
  }

  async setStorageItem(key: string, value: string): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.setStorageItem) {
      try {
        return await BackgroundAlertModule.setStorageItem(key, value);
      } catch (err) {
        console.warn('[BackgroundAlertService] setStorageItem failed:', err);
        return false;
      }
    }
    return false;
  }

  async removeStorageItem(key: string): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.removeStorageItem) {
      try {
        return await BackgroundAlertModule.removeStorageItem(key);
      } catch (err) {
        console.warn('[BackgroundAlertService] removeStorageItem failed:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * In-App Auto-Updater Methods
   */
  async getAppVersion(): Promise<{ versionName: string; versionCode: number; packageName: string } | null> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.getAppVersion) {
      try {
        return await BackgroundAlertModule.getAppVersion();
      } catch (err) {
        console.warn('[BackgroundAlertService] getAppVersion failed:', err);
        return null;
      }
    }
    return { versionName: '1.0.0', versionCode: 1, packageName: 'com.restaurant.admin' };
  }

  async checkInstallPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.checkInstallPermission) {
      try {
        return await BackgroundAlertModule.checkInstallPermission();
      } catch (err) {
        console.warn('[BackgroundAlertService] checkInstallPermission failed:', err);
        return false;
      }
    }
    return true;
  }

  requestInstallPermission() {
    if (Platform.OS === 'android' && BackgroundAlertModule?.requestInstallPermission) {
      try {
        BackgroundAlertModule.requestInstallPermission();
      } catch (err) {
        console.warn('[BackgroundAlertService] requestInstallPermission failed:', err);
      }
    }
  }

  async downloadAndInstallApk(downloadUrl: string): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.downloadAndInstallApk) {
      return await BackgroundAlertModule.downloadAndInstallApk(downloadUrl);
    }
    throw new Error('In-app updates are only supported on Android.');
  }

  async installDownloadedApk(): Promise<boolean> {
    if (Platform.OS === 'android' && BackgroundAlertModule?.installDownloadedApk) {
      return await BackgroundAlertModule.installDownloadedApk();
    }
    throw new Error('In-app updates are only supported on Android.');
  }

  onUpdateProgress(callback: (data: { progress: number; current: number; total: number }) => void): () => void {
    const subscription = DeviceEventEmitter.addListener('onUpdateProgress', callback);
    return () => subscription.remove();
  }
}

export const backgroundAlertService = new BackgroundAlertService();
