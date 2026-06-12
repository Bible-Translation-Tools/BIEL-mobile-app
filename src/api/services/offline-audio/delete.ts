import {
  getChapterCueFile,
  getChapterMp3File,
  getOfflineAudioDirectory,
  normalizeBookSlug,
} from '@/constants/offline-storage';
import {
  deleteAudioBook as deleteAudioBookRecord,
  deleteAudioChapter as deleteAudioChapterRecord,
  listDownloadedAudioBookSlugs,
} from '@/db';

export async function deleteBookAudio(languageCode: string, bookSlug: string): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const audioDir = getOfflineAudioDirectory(languageCode, canonicalSlug);
  if (audioDir.exists) {
    audioDir.delete();
  }
  await deleteAudioBookRecord(languageCode, canonicalSlug);
}

export async function deleteLanguageAudio(languageCode: string): Promise<void> {
  const slugs = await listDownloadedAudioBookSlugs(languageCode);
  for (const bookSlug of slugs) {
    await deleteBookAudio(languageCode, bookSlug);
  }
}

export async function deleteChapterAudio(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<void> {
  const canonicalSlug = normalizeBookSlug(bookSlug);
  const mp3File = getChapterMp3File(languageCode, canonicalSlug, chapter);
  const cueFile = getChapterCueFile(languageCode, canonicalSlug, chapter);

  if (mp3File.exists) mp3File.delete();
  if (cueFile.exists) cueFile.delete();

  await deleteAudioChapterRecord(languageCode, canonicalSlug, chapter);
}
