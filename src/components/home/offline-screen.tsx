import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OfflineScreenProps = {
  onRetry?: () => void;
};

export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  return (
    <View style={styles.container}>
      <IconSymbol
        name={{ ios: 'wifi.slash', android: 'wifi-off' }}
        size={100}
        color={theme.iconPrimary}
      />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.textHeading }]}>{t('offlineTitle')}</Text>
        <Text style={[styles.message, { color: theme.textHeading }]}>{t('offlineMessage')}</Text>
      </View>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: theme.tabActive,
              borderColor: theme.tabActive,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t('retryConnecting')}>
          <Text style={styles.retryButtonText}>{t('retryConnecting')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 90,
    paddingHorizontal: HomeLayout.padding,
    alignItems: 'center',
    gap: HomeLayout.contentGap,
  },
  copy: {
    alignItems: 'center',
    gap: HomeLayout.headerGap,
  },
  title: {
    ...Typography.headingH4,
    fontWeight: '400',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: HomeLayout.cardRadius,
    padding: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
  },
});
