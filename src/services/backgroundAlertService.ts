import { NativeModules, Platform } from 'react-native';

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
