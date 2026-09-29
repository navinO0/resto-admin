import { Vibration } from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { backgroundAlertService } from './backgroundAlertService';

const DEFAULT_ALARM_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

class AlarmService {
  private player: AudioPlayer | null = null;
  private isRinging: boolean = false;
  private ringTimeout: any = null;

  async startAlert(soundUri?: string) {
    if (this.isRinging) return;
    this.isRinging = true;

    console.log('[AlarmService] 🔔 Starting continuous order ringing & vibration...');

    // 1. Wake screen up immediately from lock / sleep state
    backgroundAlertService.wakeUpScreen();

    try {
      Vibration.vibrate([0, 700, 300, 700], true);
    } catch (e) {
      console.warn('[AlarmService] Vibration warning:', e);
    }

    try {
      if (this.player) {
        try {
          this.player.pause();
          this.player.release();
        } catch (_) {}
        this.player = null;
      }

      const audioUri = soundUri || DEFAULT_ALARM_URL;
      this.player = createAudioPlayer({ uri: audioUri });
      this.player.loop = true;
      this.player.volume = 1.0;
      this.player.play();
      console.log('[AlarmService] ✅ Audio playback active.');
    } catch (err) {
      console.error('[AlarmService] Failed to play alarm audio:', err);
    }
  }

  async stopAlert() {
    this.isRinging = false;

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    try {
      Vibration.cancel();
    } catch (_) {}

    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch (err) {
        console.warn('[AlarmService] Error releasing player:', err);
      } finally {
        this.player = null;
      }
    }
    console.log('[AlarmService] 🔕 Alarm silenced.');
  }

  getIsRinging(): boolean {
    return this.isRinging;
  }
}

export const alarmService = new AlarmService();
