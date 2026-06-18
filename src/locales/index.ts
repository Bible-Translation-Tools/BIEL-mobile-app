import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import hi from './hi.json';
import id from './id.json';
import pt from './pt.json';
import ru from './ru.json';
import vi from './vi.json';
import zh from './zh.json';

export const localeResources = {
  en,
  es,
  fr,
  pt,
  de,
  zh,
  hi,
  id,
  vi,
  ru,
} as const;

export type LocaleResourceBundle = (typeof localeResources)[keyof typeof localeResources];
