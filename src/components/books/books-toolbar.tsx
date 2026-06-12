import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { InterfaceLanguageButton } from '@/components/locale/interface-language-button';
import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BookLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BooksToolbar() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('common');

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('goBack')}>
        <IconSymbol
          name={{ ios: 'chevron.left', android: 'arrow_back' }}
          size={28}
          color={theme.textHeading}
        />
        <Text style={[styles.backText, { color: theme.textHeading }]}>{t('back')}</Text>
      </Pressable>

      <View style={styles.trailing}>
        <InterfaceLanguageButton
          textColor={theme.textHeading}
          iconColor={theme.textHeading}
          backgroundColor={theme.backgroundElement}
          borderColor={theme.borderSecondary}
          borderRadius={BookLayout.cardRadius}
        />

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
});
