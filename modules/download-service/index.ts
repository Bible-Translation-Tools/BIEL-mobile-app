/**
 * Android foreground service that keeps the app running while a download is in progress, and
 * shows the download progress notification. Not available on iOS or web: every call is a no-op.
 */
import { requireOptionalNativeModule } from 'expo';

type DownloadServiceModule = {
  show(channelId: string, title: string, body: string, percent: number): void;
  stop(): void;
};

const native = requireOptionalNativeModule<DownloadServiceModule>('DownloadService');

export type DownloadServiceContent = {
  channelId: string;
  title: string;
  body: string;
  percent: number;
};

/** True where the service exists (Android builds that include the native module). */
export function isDownloadServiceAvailable(): boolean {
  return native != null;
}

/** Starts the service, or updates its notification when it is already running. */
export function showDownloadService(content: DownloadServiceContent): void {
  native?.show(content.channelId, content.title, content.body, Math.round(content.percent));
}

/** Stops the service and removes its notification. */
export function stopDownloadService(): void {
  native?.stop();
}
