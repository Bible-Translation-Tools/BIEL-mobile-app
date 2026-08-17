import type { ThemeColor } from '@/constants/theme';
import type { BookItem, ChapterItem } from '@/types/book';

export type ContentTypeIndicator = 'both' | 'mixed' | 'text' | 'audio';

export type LibraryContentFilter = 'all' | 'scripture' | 'audio' | 'both';

export const CONTENT_TYPE_COLORS: Record<
  ContentTypeIndicator,
  { background: ThemeColor; foreground: ThemeColor }
> = {
  both: { background: 'badgeBothBackground', foreground: 'badgeBothForeground' },
  text: { background: 'badgeTextBackground', foreground: 'badgeTextForeground' },
  audio: { background: 'badgeAudioBackground', foreground: 'badgeAudioForeground' },
  mixed: { background: 'badgeMixedBackground', foreground: 'badgeMixedForeground' },
};

export const CHAPTER_CONTENT_LEGEND_ORDER: Exclude<ContentTypeIndicator, 'mixed'>[] = [
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

export function getContentTypeIndicator(book: BookItem): ContentTypeIndicator {
  const { hasText, hasAudio } = getBookContentFlags(book);
  if (hasText && hasAudio) return 'both';
  if (hasText) return 'text';
  return 'audio';
}

export function getChapterContentIndicator(
  chapter: ChapterItem,
): Exclude<ContentTypeIndicator, 'mixed'> | null {
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
