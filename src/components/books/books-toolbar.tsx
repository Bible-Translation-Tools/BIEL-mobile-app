import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BooksToolbarProps = {
  languageName: string;
};

export function BooksToolbar({ languageName }: BooksToolbarProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <IconSymbol
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={28}
          color={theme.textHeading}
        />
        <Text style={[styles.backText, { color: theme.textHeading }]}>Back</Text>
      </Pressable>

      <View style={styles.trailing}>
        <Pressable
          style={({ pressed }) => [
            styles.languageButton,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.borderSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={`Selected language ${languageName}`}>
          <View style={styles.languageLabel}>
            <IconSymbol
              name={{ ios: 'translate', android: 'translate', web: 'translate' }}
              size={16}
              color={theme.textHeading}
            />
            <Text style={[styles.languageText, { color: theme.textHeading }]} numberOfLines={1}>
              {languageName}
            </Text>
          </View>
          <IconSymbol
            name={{
              ios: 'chevron.down',
              android: 'keyboard_arrow_down',
              web: 'keyboard_arrow_down',
            }}
            size={16}
            color={theme.textHeading}
          />
        </Pressable>

        <SettingsToolbarButton iconSize={28} hitSize={28} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BookLayout.padding,
    paddingVertical: BookLayout.padding,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BookLayout.cardRadius,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
    borderRadius: BookLayout.cardRadius,
    borderWidth: 1,
    flexShrink: 1,
  },
  languageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  languageText: {
    ...Typography.bodyMdSemibold,
    flexShrink: 1,
  },
});
