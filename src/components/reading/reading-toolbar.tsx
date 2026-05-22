import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReadingToolbar() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <IconSymbol
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={ReadingLayout.toolbarIconSize}
          color={theme.iconPrimary}
        />
      </Pressable>

      <View style={styles.trailing}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Text settings">
          <IconSymbol
            name={{ ios: 'textformat.size', android: 'format-size', web: 'format-size' }}
            size={ReadingLayout.toolbarIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Download chapter">
          <IconSymbol
            name={{ ios: 'arrow.down.circle', android: 'file_download', web: 'file_download' }}
            size={ReadingLayout.toolbarIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.settingsButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Settings">
          <IconSymbol
            name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
            size={ReadingLayout.toolbarSettingsIconSize}
            color={theme.iconPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ReadingLayout.toolbarHeight,
    paddingHorizontal: ReadingLayout.toolbarPaddingH,
    paddingVertical: ReadingLayout.toolbarPaddingV,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarTrailingGap,
  },
  iconButton: {
    width: ReadingLayout.toolbarIconSize,
    height: ReadingLayout.toolbarIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: ReadingLayout.toolbarIconSize,
    height: ReadingLayout.toolbarIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
