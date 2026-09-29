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
}

export const backgroundAlertService = new BackgroundAlertService();
