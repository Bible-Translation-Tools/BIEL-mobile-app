import { graphqlRequest } from '@/lib/graphql/client';
import { CHAPTER_AUDIO_QUERY, CHAPTER_TIMING_QUERY } from '@/lib/graphql/queries';
import type {
  ChapterAudioQueryResult,
  ChapterTimingQueryResult,
  VerseTiming,
} from '@/types/audio';

export async function fetchChapterAudioUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const data = await graphqlRequest<ChapterAudioQueryResult>(CHAPTER_AUDIO_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (rendered.url && rendered.url.includes('CONTENTS')) return rendered.url;
    }
  }

  return null;
}

export async function fetchChapterTimingUrl(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<string | null> {
  const data = await graphqlRequest<ChapterTimingQueryResult>(CHAPTER_TIMING_QUERY, {
    languageCode,
    bookSlug,
    chapter,
  });

  for (const content of data.content) {
    for (const rendered of content.rendered_contents) {
      if (rendered.url) return rendered.url;
    }
  }

  return null;
}

export async function fetchChapterVerseTimings(
  languageCode: string,
  bookSlug: string,
  chapter: number,
): Promise<VerseTiming[]> {
  const url = await fetchChapterTimingUrl(languageCode, bookSlug, chapter);
  if (!url) return [];

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download timing file (${response.status})`);
  }

  const text = await response.text();
  return parseCueVerseTimings(text);
}

/** Parses verse start times from a CUE sheet produced by the BIEL audio pipeline. */
export function parseCueVerseTimings(cueText: string): VerseTiming[] {
  const cueTrackTimes = extractCueTrackTimes(cueText);
  const jsonMarkers = extractJsonMarkerSamples(cueText);

  const cueByTrack = new Map(cueTrackTimes.map((t) => [t.track, t.time]));
  const sampleRate = deriveSampleRate(cueByTrack, jsonMarkers);

  const merged = new Map<number, number>();

  if (jsonMarkers) {
    for (const [verseStr, samples] of Object.entries(jsonMarkers)) {
      const verse = Number(verseStr);
      if (!Number.isFinite(verse) || verse < 1) continue;
      const cueTime = cueByTrack.get(verse);
      merged.set(verse, cueTime != null ? cueTime : samples / sampleRate);
    }
  }

  for (const { track, time } of cueTrackTimes) {
    if (!merged.has(track)) merged.set(track, time);
  }

  return [...merged.entries()]
    .map(([verse, time]) => ({ verse, time }))
    .sort((a, b) => a.verse - b.verse);
}

const DEFAULT_SAMPLE_RATE = 44100;

function extractJsonMarkerSamples(cueText: string): Record<string, number> | null {
  const match = cueText.match(/^\s*REM\s+COMMENT\s+(\{.*\})\s*$/m);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as { markers?: Record<string, number> };
    return parsed.markers ?? null;
  } catch {
    return null;
  }
}

function extractCueTrackTimes(cueText: string): { track: number; time: number }[] {
  const result: { track: number; time: number }[] = [];
  const lines = cueText.split(/\r?\n/);
  let currentTrack: number | null = null;

  for (const line of lines) {
    const trackMatch = line.match(/^\s*TRACK\s+(\d+)\s+AUDIO\s*$/i);
    if (trackMatch) {
      currentTrack = Number.parseInt(trackMatch[1], 10);
      continue;
    }
    if (currentTrack == null) continue;
    const indexMatch = line.match(/^\s*INDEX\s+01\s+(\d+):(\d+):(\d+)\s*$/i);
    if (indexMatch) {
      const minutes = Number.parseInt(indexMatch[1], 10);
      const seconds = Number.parseInt(indexMatch[2], 10);
      const frames = Number.parseInt(indexMatch[3], 10);
      const time = minutes * 60 + seconds + frames / 75;
      result.push({ track: currentTrack, time });
      currentTrack = null;
    }
  }

  return result;
}

function deriveSampleRate(
  cueByTrack: Map<number, number>,
  jsonMarkers: Record<string, number> | null,
): number {
  if (!jsonMarkers) return DEFAULT_SAMPLE_RATE;

  for (const [verseStr, samples] of Object.entries(jsonMarkers)) {
    const verse = Number(verseStr);
    const cueTime = cueByTrack.get(verse);
    if (cueTime && cueTime > 1 && samples > 0) {
      const derived = samples / cueTime;
      if (derived >= 8000 && derived <= 192000) return derived;
    }
  }

  return DEFAULT_SAMPLE_RATE;
}
