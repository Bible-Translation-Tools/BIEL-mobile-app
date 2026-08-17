import type { BookItem } from '@/types/book';

export type ContentTypeIndicator = 'both' | 'mixed' | 'text' | 'audio';

export type LibraryContentFilter = 'all' | 'scripture' | 'audio' | 'both';

export function getBookContentFlags(book: BookItem): { hasText: boolean; hasAudio: boolean } {
  return {
    hasText: book.downloadStatus === 'downloaded',
    hasAudio: book.audioDownloadStatus === 'downloaded' || book.hasAudio,
  };
}

export function getContentTypeIndicator(book: BookItem): ContentTypeIndicator {
  const { hasText, hasAudio } = getBookContentFlags(book);
  if (hasText && hasAudio) return 'both';
  if (hasText) return 'text';
  return 'audio';
}

export function bookMatchesContentFilter(book: BookItem, filter: LibraryContentFilter): boolean {
  if (filter === 'all') return true;

  const { hasText, hasAudio } = getBookContentFlags(book);
  if (filter === 'both') return hasText && hasAudio;
  if (filter === 'scripture') return hasText;
  return hasAudio;
}
