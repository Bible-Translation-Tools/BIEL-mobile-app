export type ScriptureVerse = {
  number: number;
  text: string;
};

export type ScriptureParagraph = {
  verses: ScriptureVerse[];
};

export type ScriptureSection = {
  heading?: string;
  paragraphs: ScriptureParagraph[];
};

export type ChapterContent = {
  bookName: string;
  chapter: number;
  sections: ScriptureSection[];
};

export type ApiChapterRendering = {
  book_name: string;
  chapter: number | null;
  rendered_content: {
    url: string;
    content: {
      name: string;
      resource_type: string;
    };
  };
};

export type ChapterContentQueryResult = {
  scriptural_rendering_metadata: ApiChapterRendering[];
};
