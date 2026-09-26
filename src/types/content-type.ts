import type { BookItem, ChapterItem } from '@/types/book';

export type ContentTypeIndicator = 'both' | 'text' | 'audio';

export type LibraryContentFilter = 'all' | 'scripture' | 'audio' | 'both';

export const CHAPTER_CONTENT_LEGEND_ORDER: ContentTypeIndicator[] = [
  'both',
  'text',
  'audio',
];

export function getBookContentFlags(book: BookItem): { hasText: boolean; hasAudio: boolean } {
  return {
    hasText: book.downloadStatus === 'downloaded',
    hasAudio: book.audioDownloadStatus === 'downloaded' || book.hasAudio,
  };
}

export function getChapterContentIndicator(
  chapter: ChapterItem,
): ContentTypeIndicator | null {
  const hasText = chapter.hasText === true;
  const hasAudio = chapter.hasAudio === true;
  if (hasText && hasAudio) return 'both';
  if (hasText) return 'text';
  if (hasAudio) return 'audio';
  return null;
}

export function bookMatchesContentFilter(book: BookItem, filter: LibraryContentFilter): boolean {
  if (filter === 'all') return true;

  const { hasText, hasAudio } = getBookContentFlags(book);
  if (filter === 'both') return hasText && hasAudio;
  if (filter === 'scripture') return hasText;
  return hasAudio;
}
