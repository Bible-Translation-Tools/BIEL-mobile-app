import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

/** Legacy underscore names used in the app → Material Icons glyph names. */
const MATERIAL_ICON_ALIASES: Record<string, MaterialIconName> = {
  add: 'add',
  arrow_back: 'arrow-back',
  chevron_right: 'chevron-right',
  download: 'download',
  download_done: 'download-done',
  file_download: 'download',
  format_align_left: 'format-align-left',
  format_line_spacing: 'format-line-spacing',
  format_size: 'format-size',
  remove: 'remove',
  keyboard_arrow_down: 'keyboard-arrow-down',
  keyboard_arrow_right: 'keyboard-arrow-right',
  keyboard_arrow_up: 'keyboard-arrow-up',
  volume_up: 'volume-up',
  close: 'close',
  'light-mode': 'light-mode',
  'dark-mode': 'dark-mode',
};

export type IconSymbolName =
  | string
  | {
      ios: string;
      android: string;
    };

/** Material icons rendered on every platform (including iOS). */
export const DOWNLOAD_ICON_NAME = 'download';
export const DOWNLOAD_DONE_ICON_NAME = 'download-done';
export const DELETE_ICON_NAME = 'delete';
export const SETTINGS_ICON_NAME = 'settings';
export const TRANSLATE_ICON_NAME = 'translate';

const MATERIAL_ICON_NAMES = new Set<string>([
  DOWNLOAD_ICON_NAME,
  DOWNLOAD_DONE_ICON_NAME,
  DELETE_ICON_NAME,
  SETTINGS_ICON_NAME,
  TRANSLATE_ICON_NAME,
]);

type IconSymbolProps = {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
};

function usesMaterialIconOnIos(name: IconSymbolName): boolean {
  if (typeof name === 'string') {
    return MATERIAL_ICON_NAMES.has(name);
  }

  return MATERIAL_ICON_NAMES.has(name.ios) || MATERIAL_ICON_NAMES.has(name.android);
}

function resolveMaterialName(name: IconSymbolName): MaterialIconName {
  const raw =
    typeof name === 'object'
      ? Platform.OS === 'ios' && usesMaterialIconOnIos(name)
        ? name.ios
        : name.android
      : name;
  return MATERIAL_ICON_ALIASES[raw] ?? (raw as MaterialIconName);
}

function resolveSymbolName(name: IconSymbolName): SymbolViewProps['name'] {
  const raw = typeof name === 'object' ? name.ios : name;
  return raw as SymbolViewProps['name'];
}

export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  if (Platform.OS === 'ios' && !usesMaterialIconOnIos(name)) {
    return (
      <SymbolView
        name={resolveSymbolName(name)}
        size={size}
        tintColor={color}
        style={style}
      />
    );
  }

  return (
    <MaterialIcons
      name={resolveMaterialName(name)}
      size={size}
      color={color}
      style={style as StyleProp<TextStyle>}
    />
  );
}
