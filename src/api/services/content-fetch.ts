export const BIEL_API_ORIGIN = 'https://api.bibleineverylanguage.org';

/** Headers required for read.bibletranslationtools.org (Cloudflare allows BIEL API referer). */
export const CONTENT_FETCH_HEADERS = {
  Accept: 'application/json, text/html, */*',
  'User-Agent': 'Mozilla/5.0',
  Referer: `${BIEL_API_ORIGIN}/`,
} as const;

export async function fetchRenderedContent(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...CONTENT_FETCH_HEADERS,
      ...init?.headers,
    },
  });
}
