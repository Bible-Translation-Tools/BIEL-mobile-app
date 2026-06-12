import { graphqlRequest } from '@/api/graphql/client';
import { LANGUAGE_AUDIO_FILES_QUERY } from '@/api/graphql/queries';
import { getChapterMp3File, normalizeBookSlug } from '@/constants/offline-storage';
import type {
  AudioBookManifest,
  BookAudioFilesQueryResult,
  ChapterAudioQueryResult,
  ResolvedChapterAudio,
} from '@/types/audio';

import { isManifestChapterSetComplete } from './manifest-helpers';

export {
  isManifestChapterSetComplete,
  mergeChapterRecords,
  sumChapterBytes,
  sumManifestBytes,
} from './manifest-helpers';

/** Dedupes overlapping LANGUAGE_AUDIO_FILES_QUERY requests per language code. */
const languageAudioFilesInflight = new Map<string, Promise<BookAudioFilesQueryResult>>();

function isContentsUrl(url: string | null | undefined): boolean {
  return Boolean(url && url.includes('CONTENTS'));
}

function parseBookAudioManifest(
  data: BookAudioFilesQueryResult,
  bookSlug: string,
): Pick<AudioBookManifest, 'bookName' | 'chapters'> {
  const byChapter = new Map<
    number,
    { mp3Url?: string; mp3ByteSize?: number; cueUrl?: string; cueByteSize?: number }
  >();
  let bookName = bookSlug;

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (!isContentsUrl(rendered.url)) continue;

      const meta = rendered.scriptural_rendering_metadata;
      if (!meta) continue;

      const chapter = meta.chapter;
      if (chapter == null) continue;

      if (meta.book_name) {
        bookName = meta.book_name;
      }

      const entry = byChapter.get(chapter) ?? {};
      const fileType = rendered.file_type?.toLowerCase();

      if (fileType === 'mp3') {
        entry.mp3Url = rendered.url;
        entry.mp3ByteSize = rendered.file_size_bytes ?? 0;
      } else if (fileType === 'cue') {
        entry.cueUrl = rendered.url;
        entry.cueByteSize = rendered.file_size_bytes ?? 0;
      }

      byChapter.set(chapter, entry);
    }
  }

  const chapters: ResolvedChapterAudio[] = [...byChapter.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([chapter, entry]) => {
      if (!entry.mp3Url) return [];
      return [
        {
          chapter,
          mp3Url: entry.mp3Url,
          mp3ByteSize: entry.mp3ByteSize ?? 0,
          cueUrl: entry.cueUrl,
          cueByteSize: entry.cueByteSize,
        },
      ];
    });

  return { bookName, chapters };
}

function parseLanguageAudioManifests(
  data: BookAudioFilesQueryResult,
): Map<string, AudioBookManifest> {
  const renderedByBook = new Map<
    string,
    BookAudioFilesQueryResult['content'][number]['rendered_contents']
  >();

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      const meta = rendered.scriptural_rendering_metadata;
      if (!meta?.book_slug) continue;

      const slug = normalizeBookSlug(meta.book_slug);
      const renderedContents = renderedByBook.get(slug) ?? [];
      renderedContents.push(rendered);
      renderedByBook.set(slug, renderedContents);
    }
  }

  const manifests = new Map<string, AudioBookManifest>();
  for (const [bookSlug, renderedContents] of renderedByBook) {
    const { bookName, chapters } = parseBookAudioManifest(
      { content: [{ rendered_contents: renderedContents }] },
      bookSlug,
    );
    manifests.set(bookSlug, { bookSlug, bookName, chapters });
  }

  return manifests;
}

async function fetchLanguageAudioFiles(languageCode: string): Promise<BookAudioFilesQueryResult> {
  const key = languageCode.toUpperCase();
  const inflight = languageAudioFilesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = graphqlRequest<BookAudioFilesQueryResult>(LANGUAGE_AUDIO_FILES_QUERY, {
    languageCode,
  }).finally(() => {
    languageAudioFilesInflight.delete(key);
  });
  languageAudioFilesInflight.set(key, request);
  return request;
}

export async function getLanguageAudioManifests(
  languageCode: string,
): Promise<Map<string, AudioBookManifest>> {
  return parseLanguageAudioManifests(await fetchLanguageAudioFiles(languageCode));
}

export function isBookFullyDownloadedLocally(
  manifest: Pick<AudioBookManifest, 'chapters'>,
  languageCode: string,
  bookSlug: string,
  downloadedNumbers: number[],
): boolean {
  if (!isManifestChapterSetComplete(manifest, downloadedNumbers)) {
    return false;
  }

  for (const chapter of manifest.chapters) {
    const mp3File = getChapterMp3File(languageCode, bookSlug, chapter.chapter);
    if (!mp3File.exists) {
      return false;
    }
  }

  return true;
}

export function parseBookAudioManifestFromQuery(
  data: BookAudioFilesQueryResult,
  bookSlug: string,
): Pick<AudioBookManifest, 'bookName' | 'chapters'> {
  return parseBookAudioManifest(data, bookSlug);
}

export function resolveChapterAudioFromQuery(
  data: ChapterAudioQueryResult,
): { mp3Url?: string; mp3ByteSize?: number; cueUrl?: string; cueByteSize?: number } {
  const entry: {
    mp3Url?: string;
    mp3ByteSize?: number;
    cueUrl?: string;
    cueByteSize?: number;
  } = {};

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (!isContentsUrl(rendered.url)) continue;

      const fileType = rendered.file_type?.toLowerCase();
      if (fileType === 'mp3') {
        entry.mp3Url = rendered.url;
        entry.mp3ByteSize = rendered.file_size_bytes ?? 0;
      } else if (fileType === 'cue') {
        entry.cueUrl = rendered.url;
        entry.cueByteSize = rendered.file_size_bytes ?? 0;
      }
    }
  }

  return entry;
}
