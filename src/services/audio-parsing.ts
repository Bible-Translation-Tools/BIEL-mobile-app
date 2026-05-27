import { AudioCueMetadataSerializer } from '@/data/audio-cue-metadata';
import type { VerseTiming } from '@/types/audio';

const DEFAULT_SAMPLE_RATE = 44100;

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

/** Extracts JSON markers from CUE's comment (REM) section. */
function extractJsonMarkerSamples(cueText: string): Record<string, number> | null {
  const match = cueText.match(/^\s*REM\s+COMMENT\s+(\{.*\})\s*$/m);
  if (!match) return null;
  return AudioCueMetadataSerializer.deserialize(match[1])?.markers ?? null;
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
