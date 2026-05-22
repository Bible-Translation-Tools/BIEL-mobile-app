/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2c2c2c',
    textHeading: '#1d2a38',
    background: '#f2f7fd',
    backgroundElement: '#ffffff',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#767676',
    textLabel: '#8b8b8b',
    textPlaceholder: '#999da2',
    border: '#e7e7e7',
    borderSecondary: '#d5deeb',
    tabActive: '#005bdd',
    tabInactive: '#51607a',
    iconPrimary: '#2c2c2c',
    iconTertiary: '#8b8b8b',
    iconSuccess: '#22ac52',
    iconDanger: '#d32f2f',
  },
  dark: {
    text: '#eaeaea',
    textHeading: '#eaeaea',
    background: '#2c2c2c',
    backgroundElement: '#212121',
    backgroundSelected: '#2E3135',
    textSecondary: '#cacaca',
    textLabel: '#cacaca',
    textPlaceholder: '#999da2',
    border: '#373737',
    borderSecondary: '#373737',
    tabActive: '#4084e5',
    tabInactive: '#cacaca',
    iconPrimary: '#ffffff',
    iconTertiary: '#767676',
    iconSuccess: '#22ac52',
    iconDanger: '#ef5350',
  },
} as const;

export const Typography = {
  headingH4: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '500' as const,
  },
  headingH6: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  headingH7: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 32,
    fontWeight: '400' as const,
  },
  verseNumber: {
    fontSize: 10.32,
    lineHeight: 32,
    fontWeight: '400' as const,
  },
  bodyMdSemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
} as const;

export const HomeLayout = {
  padding: 16,
  contentGap: 20,
  headerGap: 8,
  listGap: 16,
  rowGap: 8,
  cardRadius: 8,
  cardPaddingH: 16,
  cardPaddingV: 12,
  downloadButtonSize: 70,
  bookIconSize: 38,
} as const;

export const BookLayout = {
  ...HomeLayout,
  bookDownloadButtonSize: 60,
  tabBorderWidth: 2,
  chapterColumns: 6,
  chapterGap: 6,
  chapterCellRadius: 4,
  chapterCellPadding: 10,
  chapterCellMinHeight: 48,
} as const;

export const ReadingLayout = {
  padding: 16,
  contentGap: 24,
  sectionGap: 8,
  toolbarPaddingV: 8,
  playButtonSize: 54,
  playButtonBottom: 20,
  scrollBottomInset: 100,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Splash screen (Figma node 469:6375) */
export const Splash = {
  background: '#208AEF',
  logoOpacity: 0.5,
} as const;

export const SplashDesign = {
  frameWidth: 412,
  padding: 16,
  bookSize: 214,
  logoWidth: 87.632,
  logoHeight: 26.41,
} as const;
