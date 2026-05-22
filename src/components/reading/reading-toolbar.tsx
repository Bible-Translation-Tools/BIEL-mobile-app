import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ReadingToolbarProps = {
  chapterTitle?: string;
};

export function ReadingToolbar({ chapterTitle }: ReadingToolbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isElevated = chapterTitle != null;

  return (
    <View
      style={[
        styles.toolbar,
        {
          paddingTop: insets.top + ReadingLayout.toolbarPaddingV,
          minHeight: insets.top + ReadingLayout.toolbarHeight,
          backgroundColor: isElevated ? theme.backgroundAccent : theme.background,
        },
        isElevated && [
          styles.toolbarElevated,
          { shadowColor: '#000' },
        ],
      ]}>
      <View style={styles.leading}>
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
        {chapterTitle ? (
          <Text
            style={[styles.chapterTitle, { color: theme.text }]}
            numberOfLines={1}>
            {chapterTitle}
          </Text>
        ) : null}
      </View>

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
    paddingHorizontal: ReadingLayout.toolbarPaddingH,
    paddingBottom: ReadingLayout.toolbarPaddingV,
  },
  toolbarElevated: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarLeadingGap,
    minWidth: 0,
  },
  chapterTitle: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarTrailingGap,
    flexShrink: 0,
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
