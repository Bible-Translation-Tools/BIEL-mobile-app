import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/i18n';
import { listActiveDownloadTasks } from '@/stores/download-progress-store';
import type { DownloadProgressTask } from '@/types/download-progress';

const DOWNLOAD_CHANNEL_ID = 'book-downloads';
const ACTIVE_DOWNLOAD_NOTIFICATION_ID = 'biel-active-book-download';
const NOTIFICATION_KIND = {
  progress: 'download-progress',
  finished: 'download-finished',
} as const;

const PROGRESS_SYNC_MIN_INTERVAL_MS = 1500;
const PROGRESS_SYNC_MIN_PERCENT_DELTA = 5;

let initialized = false;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let lastProgressPercent: number | null = null;
let lastProgressSyncAt = 0;

function clearDismissTimer() {
  if (dismissTimer != null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function taskTitle(task: DownloadProgressTask): string {
  if (task.kind === 'book-audio') {
    return i18n.t('download:notification.downloadingAudio', { name: task.bookName });
  }
  return i18n.t('download:notification.downloadingScripture', { name: task.bookName });
}

function resetProgressSyncState() {
  lastProgressPercent = null;
  lastProgressSyncAt = 0;
}

function shouldThrottleProgressSync(percent: number): boolean {
  if (lastProgressPercent === null) return false;
  if (Math.abs(percent - lastProgressPercent) >= PROGRESS_SYNC_MIN_PERCENT_DELTA) return false;
  return Date.now() - lastProgressSyncAt < PROGRESS_SYNC_MIN_INTERVAL_MS;
}

function buildNotificationContent(active: DownloadProgressTask[]) {
  if (active.length === 0) {
    return null;
  }

  if (active.length === 1) {
    const task = active[0]!;
    const percent = Math.round(task.progress * 100);
    return {
      title: taskTitle(task),
      body: i18n.t('download:notification.progress', { percent }),
      percent,
      data: { taskId: task.id, kind: NOTIFICATION_KIND.progress },
    };
  }

  const averageProgress =
    active.reduce((sum, task) => sum + task.progress, 0) / active.length;
  const percent = Math.round(averageProgress * 100);

  return {
    title: i18n.t('download:notification.downloadingMultiple', { count: active.length }),
    body: i18n.t('download:notification.progress', { percent }),
    percent,
    data: { taskId: 'multiple', kind: NOTIFICATION_KIND.progress },
  };
}

async function presentNotification(
  content: Notifications.NotificationContentInput,
  kind: (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND],
) {
  const isProgress = kind === NOTIFICATION_KIND.progress;

  await Notifications.scheduleNotificationAsync({
    identifier: ACTIVE_DOWNLOAD_NOTIFICATION_ID,
    content: {
      ...content,
      sticky: Platform.OS === 'android',
      autoDismiss: false,
      sound: false,
      ...(Platform.OS === 'ios'
        ? {
            interruptionLevel: isProgress ? 'passive' : 'active',
          }
        : {}),
    },
    trigger: null,
  });
}

export async function initDownloadNotifications(): Promise<void> {
  if (initialized || Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isProgress =
        notification.request.content.data?.kind === NOTIFICATION_KIND.progress;

      return {
        shouldShowBanner: !isProgress,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DOWNLOAD_CHANNEL_ID, {
      name: i18n.t('download:notification.channelName'),
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== Notifications.PermissionStatus.GRANTED) {
    await Notifications.requestPermissionsAsync();
  }

  initialized = true;
}

export async function syncDownloadNotification(): Promise<void> {
  if (Platform.OS === 'web' || !initialized) return;

  clearDismissTimer();

  const active = listActiveDownloadTasks();
  const content = buildNotificationContent(active);

  if (!content) {
    resetProgressSyncState();
    await Notifications.dismissNotificationAsync(ACTIVE_DOWNLOAD_NOTIFICATION_ID).catch(
      () => {},
    );
    return;
  }

  if (shouldThrottleProgressSync(content.percent)) {
    return;
  }

  lastProgressPercent = content.percent;
  lastProgressSyncAt = Date.now();

  await presentNotification(
    {
      title: content.title,
      body: content.body,
      data: content.data,
      ...(Platform.OS === 'android' ? { channelId: DOWNLOAD_CHANNEL_ID } : {}),
    },
    NOTIFICATION_KIND.progress,
  );
}

export async function showDownloadFinishedNotification(
  task: DownloadProgressTask,
  succeeded: boolean,
): Promise<void> {
  if (Platform.OS === 'web' || !initialized) return;

  clearDismissTimer();

  const title = succeeded
    ? i18n.t('download:notification.complete', { name: task.bookName })
    : i18n.t('download:notification.failed', { name: task.bookName });

  const body = succeeded
    ? undefined
    : task.errorMessage ?? i18n.t('download:downloadFailedMessage');

  resetProgressSyncState();

  await presentNotification(
    {
      title,
      body,
      data: { taskId: task.id, kind: NOTIFICATION_KIND.finished },
      ...(Platform.OS === 'android' ? { channelId: DOWNLOAD_CHANNEL_ID } : {}),
    },
    NOTIFICATION_KIND.finished,
  );

  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    void Notifications.dismissNotificationAsync(ACTIVE_DOWNLOAD_NOTIFICATION_ID);
  }, 4000);
}
