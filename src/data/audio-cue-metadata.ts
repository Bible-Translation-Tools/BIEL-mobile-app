export type AudioCueMetadata = {
  anthology?: string;
  language?: string;
  version?: string;
  slug?: string;
  book_number?: string;
  mode?: string;
  chapter?: string;
  startv?: string;
  endv?: string;
  contributor?: string;
  markers: Record<string, number>;
};

export class AudioCueMetadataSerializer {
  static deserialize(json: string): AudioCueMetadata | null {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!isRecord(parsed)) return null;
      const markers = parseMarkers(parsed.markers);
      if (!markers) return null;
      return {
        anthology: asOptionalString(parsed.anthology),
        language: asOptionalString(parsed.language),
        version: asOptionalString(parsed.version),
        slug: asOptionalString(parsed.slug),
        book_number: asOptionalString(parsed.book_number),
        mode: asOptionalString(parsed.mode),
        chapter: asOptionalString(parsed.chapter),
        startv: asOptionalString(parsed.startv),
        endv: asOptionalString(parsed.endv),
        contributor: asOptionalString(parsed.contributor),
        markers,
      };
    } catch {
      return null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseMarkers(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const markers: Record<string, number> = {};
  for (const [key, markerValue] of Object.entries(value)) {
    if (typeof markerValue !== 'number' || !Number.isFinite(markerValue)) return null;
    markers[key] = markerValue;
  }
  return markers;
}
