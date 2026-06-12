import { File } from 'expo-file-system';

import { fetchRenderedContent } from '@/api/services/content-fetch';

export async function writeBinaryFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download audio (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const tempFile = new File(targetFile.parentDirectory, `${targetFile.name}.tmp`);

  if (tempFile.exists) {
    tempFile.delete();
  }

  tempFile.write(bytes);

  if (targetFile.exists) {
    targetFile.delete();
  }

  tempFile.move(targetFile);
  return bytes.byteLength;
}

export async function writeTextFile(
  url: string,
  targetFile: File,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const response = await fetchRenderedContent(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`Failed to download timing file (${response.status})`);
  }

  const text = await response.text();
  const tempFile = new File(targetFile.parentDirectory, `${targetFile.name}.tmp`);

  if (tempFile.exists) {
    tempFile.delete();
  }

  tempFile.write(text);

  if (targetFile.exists) {
    targetFile.delete();
  }

  tempFile.move(targetFile);
  return new TextEncoder().encode(text).length;
}

export function writeLocalTextFile(text: string, targetFile: File): number {
  const tempFile = new File(targetFile.parentDirectory, `${targetFile.name}.tmp`);
  if (tempFile.exists) {
    tempFile.delete();
  }
  tempFile.write(text);
  if (targetFile.exists) {
    targetFile.delete();
  }
  tempFile.move(targetFile);
  return new TextEncoder().encode(text).length;
}
