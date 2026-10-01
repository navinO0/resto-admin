import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../store/useAdminStore';
import { updateService } from '../services/updateService';
import { backgroundAlertService } from '../services/backgroundAlertService';

export const UpdateModal: React.FC = () => {
  const {
    isUpdateModalVisible,
    setUpdateModalVisible,
    availableUpdate,
  } = useAdminStore();

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState('0.0');
  const [totalMB, setTotalMB] = useState('0.0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPermissionNeeded, setIsPermissionNeeded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (!isUpdateModalVisible) {
      setIsDownloading(false);
      setProgress(0);
      setErrorMsg(null);
      setIsPermissionNeeded(false);
      setIsDownloaded(false);
      return;
    }

    const unsub = backgroundAlertService.onUpdateProgress((data) => {
      setProgress(data.progress);
      if (data.current > 0) {
        setDownloadedMB((data.current / (1024 * 1024)).toFixed(1));
      }
      if (data.total > 0) {
        setTotalMB((data.total / (1024 * 1024)).toFixed(1));
      }
    });

    return () => unsub();
  }, [isUpdateModalVisible]);

  if (!isUpdateModalVisible || !availableUpdate) {
    return null;
  }

  const fileSizeDisplay = availableUpdate.fileSize > 0
    ? `${(availableUpdate.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : 'Unknown size';

  const handleStartUpdate = async () => {
    setErrorMsg(null);
    setIsPermissionNeeded(false);

    if (Platform.OS !== 'android') {
      setErrorMsg('Direct APK updates are only available on Android devices.');
      return;
    }

    const hasPermission = await updateService.checkInstallPermission();
    if (!hasPermission) {
      setIsPermissionNeeded(true);
      updateService.requestInstallPermission();
      return;
    }

    try {
      setIsDownloading(true);
      setProgress(0);
      await updateService.downloadAndInstall(availableUpdate.downloadUrl);
      setIsDownloaded(true);
      setIsDownloading(false);
    } catch (err: any) {
      setIsDownloading(false);
      const msg = err?.message || 'Failed to complete update download.';
      if (msg.includes('PERMISSION') || err?.code === 'PERMISSION_REQUIRED') {
        setIsPermissionNeeded(true);
      } else {
        setErrorMsg(msg);
      }
    }
  };

  const handleInstallDownloaded = async () => {
    setErrorMsg(null);
    try {
      await updateService.installDownloaded();
    } catch (err: any) {
      const msg = err?.message || 'Failed to trigger installation.';
      if (msg.includes('PERMISSION') || err?.code === 'PERMISSION_REQUIRED') {
        setIsPermissionNeeded(true);
      } else {
        setErrorMsg(msg);
      }
    }
  };

  const handleGrantPermission = () => {
    updateService.requestInstallPermission();
  };

  return (
    <Modal
      visible={isUpdateModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDownloading) {
          setUpdateModalVisible(false);
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-download" size={24} color="#EA580C" />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={styles.title}>System Update Available</Text>
                <Text style={styles.subTitle}>
                  Version {availableUpdate.version} (Build {availableUpdate.versionCode})
                </Text>
              </View>
            </View>

            {!isDownloading && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setUpdateModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Current vs New Version Pill */}
          <View style={styles.versionBar}>
            <View style={styles.versionPill}>
              <Text style={styles.versionPillLabel}>CURRENT</Text>
              <Text style={styles.versionPillValue}>
                v{availableUpdate.currentVersion} ({availableUpdate.currentVersionCode})
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
            <View style={[styles.versionPill, styles.versionPillNew]}>
              <Text style={styles.versionPillLabelNew}>TARGET</Text>
              <Text style={styles.versionPillValueNew}>
                v{availableUpdate.version} ({availableUpdate.versionCode})
              </Text>
            </View>
          </View>

          {/* Release Notes */}
          <Text style={styles.notesHeader}>WHAT'S NEW IN THIS UPDATE</Text>
          <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.notesText}>{availableUpdate.releaseNotes}</Text>
            <View style={styles.packageMeta}>
              <Text style={styles.packageMetaText}>• Package Size: {fileSizeDisplay}</Text>
              <Text style={styles.packageMetaText}>• In-Place Upgrade: User login & settings preserved</Text>
            </View>
          </ScrollView>

          {/* Permission Notice if Required */}
          {isPermissionNeeded && (
            <View style={styles.permissionBox}>
              <Ionicons name="warning-outline" size={18} color="#EA580C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>Permission Required</Text>
                <Text style={styles.permissionDesc}>
                  Please allow 'Install unknown apps' for Restaurant Admin in Android settings, then tap Install below.
                </Text>
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={handleGrantPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.grantBtnText}>Open Permission Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Progress Bar (during download) */}
          {isDownloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfoRow}>
                <Text style={styles.progressStatusText}>Downloading update package...</Text>
                <Text style={styles.progressPercentText}>{progress}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.max(progress, 4)}%` }]} />
              </View>
              <Text style={styles.progressBytesText}>
                {downloadedMB} MB / {totalMB !== '0.0' ? `${totalMB} MB` : fileSizeDisplay}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isDownloaded ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleInstallDownloaded}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Install Update Now</Text>
              </TouchableOpacity>
            ) : isDownloading ? (
              <View style={[styles.primaryBtn, styles.disabledBtn]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Downloading ({progress}%)...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setUpdateModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleStartUpdate}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Download & Update</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  versionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  versionPill: {
    flex: 1,
    alignItems: 'center',
  },
  versionPillLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  versionPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  versionPillNew: {
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  versionPillLabelNew: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  versionPillValueNew: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9A3412',
    marginTop: 1,
  },
  notesHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesContainer: {
    maxHeight: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '600',
  },
  packageMeta: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 4,
  },
  packageMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  permissionBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  permissionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  permissionDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 2,
    lineHeight: 16,
  },
  grantBtn: {
    marginTop: 8,
    backgroundColor: '#B45309',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  grantBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 4,
  },
  progressBytesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
});

