import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');

export function loadChapterHtml(name: string): string {
  return readFileSync(path.join(ASSETS_DIR, `${name}.html`), 'utf8');
}
