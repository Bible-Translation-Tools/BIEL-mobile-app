import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setDownloadsLibraryActive } from '@/stores/downloads-library-store';

export function DownloadsLibraryToolbar() {
  const theme = useTheme();
  const { t } = useTranslation('common');

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => setDownloadsLibraryActive(false)}
        accessibilityRole="button"
        accessibilityLabel={t('goBack')}>
        <IconSymbol
          name={{ ios: 'chevron.left', android: 'arrow_back' }}
          size={28}
          color={theme.text}
        />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HomeLayout.padding,
    paddingVertical: HomeLayout.padding,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: HomeLayout.cardRadius,
  },
  backText: {
    ...Typography.bodyMdSemibold,
    fontSize: 20,
  },
});
