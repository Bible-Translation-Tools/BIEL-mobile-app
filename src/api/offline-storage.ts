import { Directory, File, Paths } from 'expo-file-system';

import { normalizeBookSlug } from '@/domain/book-slug';

const OFFLINE_ROOT_DIR_NAME = 'biel-offline';

function tempFileFor(file: File): File {
  return new File(file.parentDirectory, `${file.name}.tmp`);
}

/** Writes through a `.tmp` sibling so a crash never leaves a half-written target. */
export function writeFileAtomically(targetFile: File, contents: string | Uint8Array): void {
  const tempFile = tempFileFor(targetFile);
  if (tempFile.exists) {
    tempFile.delete();
  }
  tempFile.write(contents);
  if (targetFile.exists) {
    targetFile.delete();
  }
  tempFile.move(targetFile);
}

/** Deletes a file and any `.tmp` left by an interrupted {@link writeFileAtomically}. */
export function deleteFileAndTemp(file: File): void {
  const tempFile = tempFileFor(file);
  if (tempFile.exists) {
    tempFile.delete();
  }
  if (file.exists) {
    file.delete();
  }
}

function getOfflineBookDirectory(languageCode: string, bookSlug: string): Directory {
  return new Directory(
    Paths.document,
    OFFLINE_ROOT_DIR_NAME,
    languageCode,
    normalizeBookSlug(bookSlug),
  );
}

export function getWholeJsonFile(languageCode: string, bookSlug: string): File {
  return new File(getOfflineScriptureDirectory(languageCode, bookSlug), 'whole.json');
}

export async function ensureOfflineRootExists(): Promise<void> {
  const root = new Directory(Paths.document, OFFLINE_ROOT_DIR_NAME);
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
}

export function getOfflineAudioDirectory(languageCode: string, bookSlug: string): Directory {
  return new Directory(getOfflineBookDirectory(languageCode, bookSlug), 'audio');
}

export function getChapterMp3File(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): File {
  return new File(getOfflineAudioDirectory(languageCode, bookSlug), `ch-${chapter}.mp3`);
}

export function getChapterCueFile(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): File {
  return new File(getOfflineAudioDirectory(languageCode, bookSlug), `ch-${chapter}.cue`);
}

export function ensureOfflineAudioDirectory(languageCode: string, bookSlug: string): Directory {
  const dir = getOfflineAudioDirectory(languageCode, bookSlug);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getOfflineScriptureDirectory(languageCode: string, bookSlug: string): Directory {
  return new Directory(getOfflineBookDirectory(languageCode, bookSlug), 'scripture');
}

export function getChapterHtmlFile(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): File {
  return new File(getOfflineScriptureDirectory(languageCode, bookSlug), `ch-${chapter}.html`);
}

export function ensureOfflineScriptureDirectory(languageCode: string, bookSlug: string): Directory {
  const dir = getOfflineScriptureDirectory(languageCode, bookSlug);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Removes all scripture content (`whole.json`, chapter HTML); leaves `audio/` intact. */
export function removeBookScriptureDirectory(languageCode: string, bookSlug: string): void {
  const scriptureDir = getOfflineScriptureDirectory(languageCode, bookSlug);
  if (scriptureDir.exists) {
    scriptureDir.delete();
  }
}
