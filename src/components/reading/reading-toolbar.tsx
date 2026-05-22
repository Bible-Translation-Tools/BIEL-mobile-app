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
          name="chevron.left"
          size={28}
          color={theme.iconPrimary}
        />
      </Pressable>

      <View style={styles.trailing}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Text settings">
          <IconSymbol name="textformat.size" size={28} color={theme.iconPrimary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Download chapter">
          <IconSymbol name="arrow.down.circle" size={28} color={theme.iconPrimary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Settings">
          <IconSymbol name="gearshape" size={24} color={theme.iconPrimary} />
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
    paddingHorizontal: ReadingLayout.padding,
    paddingVertical: ReadingLayout.toolbarPaddingV,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
