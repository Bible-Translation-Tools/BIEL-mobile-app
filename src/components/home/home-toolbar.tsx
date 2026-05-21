import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HomeToolbar() {
  const theme = useTheme();

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({ pressed }) => [
          styles.languageButton,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Change interface language">
        <View style={styles.languageLabel}>
          <IconSymbol
            name={{ ios: 'translate', android: 'translate', web: 'translate' }}
            size={16}
            color={theme.iconPrimary}
          />
          <Text style={[styles.languageText, { color: theme.text }]}>English</Text>
        </View>
        <IconSymbol
          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
          size={16}
          color={theme.iconPrimary}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Settings">
        <IconSymbol
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={28}
          color={theme.iconPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: HomeLayout.padding,
    paddingVertical: HomeLayout.padding,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
  },
  languageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageText: {
    ...Typography.bodyMdSemibold,
  },
  settingsButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
