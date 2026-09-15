import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { useForceOffline } from '@/stores/force-offline-store';

export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const forceOffline = useForceOffline();
  const netInfo = useNetInfo();
  const offline =
    forceOffline || netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const wasOffline = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (offline && !wasOffline.current) {
      setDismissed(false);
    }
    wasOffline.current = offline;
  }, [offline]);

  if (!offline || dismissed) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          top: insets.top,
          backgroundColor: theme.warningBackground,
        },
      ]}
      accessibilityRole="alert">
      <View style={styles.message}>
        <IconSymbol
          name={{ ios: 'wifi.slash', android: 'wifi-off' }}
          size={32}
          color={theme.warningForeground}
        />
        <Text
          numberOfLines={2}
          style={[styles.messageText, { color: theme.warningForeground }]}>
          {t('offlineBanner.message')}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel={t('offlineBanner.dismiss')}>
        {({ pressed }) => (
          <Text
            style={[
              styles.dismiss,
              {
                color: theme.warningForeground,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            {t('offlineBanner.dismiss')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 1000,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    opacity: 0.9,
  },
  message: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '400',
  },
  dismiss: {
    fontSize: 20,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
