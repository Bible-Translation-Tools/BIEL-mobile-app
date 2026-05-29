export type ScriptureVerse = {
  number: number;
  lines: ScriptureLine[];
  startsOnNewLine?: boolean;
};

export type ScriptureInlinePart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'footnote';
      targetId: string;
      label: string;
    };

export type ScriptureLine = {
  indentLevel: number;
  parts: ScriptureInlinePart[];
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
  footnotes: ScriptureFootnote[];
};

export type ScriptureFootnote = {
  id: string;
  label: string;
  text: string;
};

export type ApiChapterRendering = {
  book_name: string;
  chapter: number | null;
  rendered_content: {
    url: string;
    file_size_bytes: number | null;
    content: {
      name: string;
      resource_type: string;
    };
  };
};

export type ChapterContentQueryResult = {
  scriptural_rendering_metadata: ApiChapterRendering[];
};
