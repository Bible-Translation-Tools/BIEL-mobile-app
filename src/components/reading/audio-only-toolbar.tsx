import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getToolbarTopInset, ReadingLayout } from '@/constants/theme';
import { stopPlaybackBeforeLeave } from '@/hooks/use-stop-playback-on-leave';
import { useTheme } from '@/hooks/use-theme';

type AudioOnlyToolbarProps = {
  languageCode: string;
  bookSlug: string;
  chapter: number;
};

export function AudioOnlyToolbar({ languageCode, bookSlug, chapter }: AudioOnlyToolbarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation('reading');
  const { t: tc } = useTranslation('common');

  return (
    <View
      style={[
        styles.header,
        { paddingTop: getToolbarTopInset(insets.top), backgroundColor: theme.background },
      ]}>
      <View style={styles.toolbar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            stopPlaybackBeforeLeave();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('goBack')}>
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back' }}
            size={28}
            color={theme.textHeading}
          />
          <Text style={[styles.backText, { color: theme.textHeading }]}>{tc('back')}</Text>
        </Pressable>

        <SettingsToolbarButton
          iconSize={28}
          hitSize={28}
          downloadContext={{ languageCode, bookSlug, chapter }}
          audioOnlyDownload
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ReadingLayout.padding,
    paddingTop: ReadingLayout.toolbarPaddingTop,
    paddingBottom: ReadingLayout.toolbarPaddingV,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
