import type { AudioFile, CatalogBook, CatalogLanguage, ScriptureRendering } from '@/types/catalog';

export type ChapterAudioFileType = 'mp3' | 'cue';

/**
 * Catalog interface, in our own types. Implementations translate server shapes
 * so services never see transport-specific field names.
 */
export type BielCatalogApi = {
  getLanguages(): Promise<CatalogLanguage[]>;
  getLanguageCodesWithChapterAudio(): Promise<string[]>;
  getBooksForLanguage(languageCode: string): Promise<CatalogBook[]>;
  getChapterNumbersForBook(languageCode: string, bookSlug: string): Promise<number[]>;
  getChapterRenderings(
    languageCode: string,
    bookSlug: string,
    chapter: number,
  ): Promise<ScriptureRendering[]>;
  getBookRenderings(languageCode: string, bookSlug: string): Promise<ScriptureRendering[]>;
  getLanguageScriptureRenderings(languageCode: string): Promise<ScriptureRendering[]>;
  getBookAudioFiles(languageCode: string, bookSlug: string): Promise<AudioFile[]>;
  getLanguageAudioFiles(languageCode: string): Promise<AudioFile[]>;
  getChapterAudioFiles(
    languageCode: string,
    bookSlug: string,
    chapter: number,
    fileType: ChapterAudioFileType,
  ): Promise<AudioFile[]>;
};
