import { File } from 'expo-file-system';

import { assertNetworkAvailable } from '@/api/network';
import { moveTempFileIntoPlace, tempFileFor } from '@/api/offline-storage';

/** Headers required for read.bibletranslationtools.org (Cloudflare allows BIEL API referer). */
// export const CONTENT_FETCH_HEADERS = {
//   Accept: 'application/json, text/html, */*',
//   'User-Agent': 'Mozilla/5.0',
//   Referer: `${BIEL_API_ORIGIN}/`,
// } as const;
const CONTENT_FETCH_HEADERS = {
  Accept: 'application/json, text/html, */*',
  'User-Agent': 'Mozilla/5.0',
  'X-Requested-With': 'WA-Tool-biel-mobile',
} as const;

export async function fetchRenderedContent(url: string, init?: RequestInit): Promise<Response> {
  assertNetworkAvailable();

  return fetch(url, {
    ...init,
    headers: {
      ...CONTENT_FETCH_HEADERS,
      ...init?.headers,
    },
  });
}

/** Smallest change in a file's download fraction worth reporting. */
const PROGRESS_REPORT_STEP = 0.01;

/**
 * Downloads `url` straight to `targetFile` in native code, through a `.tmp` sibling so a failed or
 * cancelled download never leaves a partial target. Returns the file size in bytes.
 *
 * The bytes never pass through JavaScript. On iOS the transfer runs in a background URLSession, so
 * it keeps going while the app is suspended (switched away from); the returned promise settles
 * when the app runs again. Rejects with an `AbortError` when `signal` aborts, and with an error
 * naming the status code on a non-2xx response.
 *
 * `onProgress` gets the fraction received (0–1), in steps of at least 1%. It is never called when
 * the server sends no `Content-Length`.
 */
export async function downloadRenderedContentToFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal; onProgress?: (fraction: number) => void },
): Promise<number> {
  assertNetworkAvailable();

  let lastReported = 0;
  const onProgress = options?.onProgress;

  const tempFile = tempFileFor(targetFile);
  if (tempFile.exists) {
    tempFile.delete();
  }

  try {
    const task = File.createDownloadTask(url, tempFile, {
      headers: { ...CONTENT_FETCH_HEADERS },
      signal: options?.signal,
      sessionType: 'background',
      onProgress: onProgress
        ? (event) => {
            // iOS reports these as BigInt despite the `number` type; Number() handles both.
            const written = Number(event.bytesWritten);
            const total = Number(event.totalBytes);
            if (!(total > 0)) return;
            const fraction = Math.min(1, written / total);
            if (fraction - lastReported < PROGRESS_REPORT_STEP && fraction < 1) return;
            lastReported = fraction;
            onProgress(fraction);
          }
        : undefined,
    });
    const downloaded = await task.downloadAsync();
    if (!downloaded) {
      throw new Error('Download was paused');
    }

    const byteSize = downloaded.size;
    await moveTempFileIntoPlace(downloaded, targetFile);
    return byteSize;
  } catch (err) {
    if (tempFile.exists) {
      tempFile.delete();
    }
    throw err;
  }
}
