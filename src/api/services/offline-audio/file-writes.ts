import { File } from 'expo-file-system';

import {
  getChapterCueFile,
  getChapterMp3File,
} from '@/constants/offline-storage';
import { abortError } from '../offline/abort';
import { writeBinaryFile, writeTextFile } from '../offline/file-writes';
import type { AudioChapterRecord } from '@/db';
import type { ResolvedChapterAudio } from '@/types/audio';

export { writeBinaryFile, writeTextFile } from '../offline/file-writes';

export function removePartialChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): void {
  for (const file of [
    getChapterMp3File(languageCode, bookSlug, chapter),
    getChapterCueFile(languageCode, bookSlug, chapter),
  ]) {
    const tempFile = new File(file.parentDirectory, `${file.name}.tmp`);
    if (tempFile.exists) {
      tempFile.delete();
    }
    if (file.exists) {
      file.delete();
    }
  }
}

export async function writeChapterAudioFiles(
  languageCode: string,
  bookSlug: string,
  chapterAudio: ResolvedChapterAudio,
  options?: { signal?: AbortSignal },
): Promise<AudioChapterRecord> {
  if (options?.signal?.aborted) {
    throw abortError();
  }

  const mp3File = getChapterMp3File(languageCode, bookSlug, chapterAudio.chapter);
  const mp3Promise = writeBinaryFile(chapterAudio.mp3Url, mp3File, {
    signal: options?.signal,
  });

  const cuePromise = chapterAudio.cueUrl
    ? (async () => {
        const cueFile = getChapterCueFile(languageCode, bookSlug, chapterAudio.chapter);
        const cueByteSize = await writeTextFile(chapterAudio.cueUrl!, cueFile, {
          signal: options?.signal,
        });
        return { cuePath: cueFile.uri, cueByteSize };
      })()
    : Promise.resolve({ cuePath: null as string | null, cueByteSize: 0 });

  const [mp3ByteSize, cueResult] = await Promise.all([mp3Promise, cuePromise]);

  return {
    chapterNumber: chapterAudio.chapter,
    mp3Path: mp3File.uri,
    cuePath: cueResult.cuePath,
    mp3ByteSize,
    cueByteSize: cueResult.cueByteSize,
  };
}
