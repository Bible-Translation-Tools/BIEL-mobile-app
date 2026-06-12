import type { ChapterContent, ScriptureVerse } from '@/types/reading';

export function allVerses(content: ChapterContent): ScriptureVerse[] {
  return content.sections.flatMap((section) =>
    section.paragraphs.flatMap((paragraph) => paragraph.verses),
  );
}

export function verseText(verse: ScriptureVerse): string {
  return verse.lines
    .map((line) =>
      line.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
