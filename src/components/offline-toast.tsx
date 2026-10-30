import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { useForceOffline } from '@/stores/force-offline-store';

/** How long the toast stays up before hiding itself. */
const TOAST_DURATION_MS = 6000;

export function OfflineToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const forceOffline = useForceOffline();
  const netInfo = useNetInfo();
  const offline =
    forceOffline || netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const wasOffline = useRef(false);
  const [visible, setVisible] = useState(false);
  const remaining = useSharedValue(1);

  // Show once per drop of the connection; hide as soon as it comes back.
  useEffect(() => {
    if (offline && !wasOffline.current) {
      setVisible(true);
    } else if (!offline) {
      setVisible(false);
    }
    wasOffline.current = offline;
  }, [offline]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    remaining.set(1);
    remaining.set(withTiming(0, { duration: TOAST_DURATION_MS, easing: Easing.linear }));
    const timer = setTimeout(() => setVisible(false), TOAST_DURATION_MS);

    return () => {
      clearTimeout(timer);
      cancelAnimation(remaining);
    };
  }, [visible, remaining]);

  const timerBarStyle = useAnimatedStyle(() => ({
    width: `${remaining.get() * 100}%`,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[
        styles.toast,
        {
          bottom: insets.bottom + 16,
          backgroundColor: theme.warningBackground,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.clip}>
        <View style={styles.body}>
          <View style={styles.message}>
            <IconSymbol
              name={{ ios: 'wifi.slash', android: 'wifi-off' }}
              size={28}
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
            onPress={() => setVisible(false)}
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
        <Animated.View
          style={[styles.timerBar, { backgroundColor: theme.warningForeground }, timerBarStyle]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 1000,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // Inner clip keeps the timer bar inside the rounded corners without clipping the iOS shadow.
  clip: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  body: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: '500',
  },
  dismiss: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  timerBar: {
    height: 4,
  },
});
