import axios from 'axios';
import { backgroundAlertService } from './backgroundAlertService';
import { useAdminStore } from '../store/useAdminStore';

export interface AppUpdateInfo {
  version: string;
  versionCode: number;
  downloadUrl: string;
  fileSize: number;
  releaseNotes: string;
  publishedAt?: string;
  minSupportedVersion?: number;
  isUpdateAvailable: boolean;
  currentVersion: string;
  currentVersionCode: number;
}

class UpdateService {
  /**
   * Checks the backend for available APK updates.
   */
  async checkForUpdates(customBaseUrl?: string): Promise<AppUpdateInfo | null> {
    try {
      const state = useAdminStore.getState();
      const candidates: string[] = [];
      if (customBaseUrl) candidates.push(customBaseUrl);
      if (state.serverUrl) candidates.push(state.serverUrl);
      candidates.push('http://10.0.2.2:4000');

      // Unique clean candidate URLs
      const uniqueUrls = Array.from(new Set(candidates.map(u => {
        let clean = u.trim().replace(/\/+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `http://${clean}`;
        }
        return clean;
      })));

      let data: any = null;
      let workingBaseUrl = '';

      for (const baseUrl of uniqueUrls) {
        try {
          const versionUrl = `${baseUrl}/api/v1/app/version`;
          const response = await axios.get(versionUrl, { timeout: 4000 });
          if (response?.data?.versionCode) {
            data = response.data;
            workingBaseUrl = baseUrl;
            break;
          }
        } catch {
          // try next
        }
      }

      if (!data || !data.versionCode) {
        console.warn('[UpdateService] Could not reach any update server.');
        return null;
      }

      const nativeInfo = await backgroundAlertService.getAppVersion();
      const currentVersion = nativeInfo?.versionName || '1.0.0';
      const currentVersionCode = nativeInfo?.versionCode || 1;

      const isUpdateAvailable = data.versionCode > currentVersionCode;

      let fullDownloadUrl = data.downloadUrl;
      if (!fullDownloadUrl.startsWith('http://') && !fullDownloadUrl.startsWith('https://')) {
        fullDownloadUrl = `${workingBaseUrl}${fullDownloadUrl.startsWith('/') ? '' : '/'}${fullDownloadUrl}`;
      }

      const updateInfo: AppUpdateInfo = {
        version: data.version,
        versionCode: data.versionCode,
        downloadUrl: fullDownloadUrl,
        fileSize: data.fileSize || 0,
        releaseNotes: data.releaseNotes || 'Bug fixes and performance improvements.',
        publishedAt: data.publishedAt,
        minSupportedVersion: data.minSupportedVersion || 1,
        isUpdateAvailable,
        currentVersion,
        currentVersionCode,
      };

      return updateInfo;
    } catch (err: any) {
      console.warn('[UpdateService] Check update error:', err.message);
      return null;
    }
  }

  /**
   * Downloads and launches the package installer for the specified APK URL.
   */
  async downloadAndInstall(downloadUrl: string): Promise<boolean> {
    return await backgroundAlertService.downloadAndInstallApk(downloadUrl);
  }

  /**
   * Installs an already-downloaded update package.
   */
  async installDownloaded(): Promise<boolean> {
    return await backgroundAlertService.installDownloadedApk();
  }

  /**
   * Checks if unknown app install permission is granted.
   */
  async checkInstallPermission(): Promise<boolean> {
    return await backgroundAlertService.checkInstallPermission();
  }

  /**
   * Requests user to grant permission to install unknown apps.
   */
  requestInstallPermission(): void {
    backgroundAlertService.requestInstallPermission();
  }
}

export const updateService = new UpdateService();
