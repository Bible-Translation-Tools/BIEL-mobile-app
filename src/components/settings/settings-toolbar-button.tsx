import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SettingsDrawer } from '@/components/settings/settings-drawer';
import { type ChapterDownloadContext } from '@/components/reading/chapter-download-menu';
import { MENU_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';

export type { ChapterDownloadContext };

type SettingsToolbarButtonProps = {
  iconSize?: number;
  hitSize?: number;
  style?: StyleProp<ViewStyle>;
  showTextSettings?: boolean;
  downloadContext?: ChapterDownloadContext;
  audioOnlyDownload?: boolean;
};

export function SettingsToolbarButton({
  iconSize = 28,
  hitSize,
  style,
  showTextSettings = false,
  downloadContext,
  audioOnlyDownload = false,
}: SettingsToolbarButtonProps) {
  const theme = useTheme();
  const buttonSize = hitSize ?? iconSize;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const close = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const open = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { width: buttonSize, height: buttonSize },
          style,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityState={{ expanded: drawerVisible }}>
        <IconSymbol name={MENU_ICON_NAME} size={iconSize} color={theme.iconPrimary} />
      </Pressable>

      <SettingsDrawer
        visible={drawerVisible}
        onClose={close}
        showTextSettings={showTextSettings}
        downloadContext={downloadContext}
        audioOnlyDownload={audioOnlyDownload}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
});
