import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChapterDownloadToolbarButton } from '@/components/reading/chapter-download-toolbar-button';
import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getToolbarTopInset, ReadingLayout } from '@/constants/theme';
import { useLeaveReadingScreen } from '@/hooks/use-leave-reading-screen';
import { useTheme } from '@/hooks/use-theme';

type AudioOnlyToolbarProps = {
  languageCode: string;
  bookSlug: string;
  bookName?: string;
  chapter: number;
};

export function AudioOnlyToolbar({
  languageCode,
  bookSlug,
  bookName,
  chapter,
}: AudioOnlyToolbarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const leaveReadingScreen = useLeaveReadingScreen();
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
          onPress={() => leaveReadingScreen()}
          accessibilityRole="button"
          accessibilityLabel={t('goBack')}>
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow_back' }}
            size={28}
            color={theme.textHeading}
          />
          <Text style={[styles.backText, { color: theme.textHeading }]}>{tc('back')}</Text>
        </Pressable>

        <View style={styles.trailing}>
          <ChapterDownloadToolbarButton
            downloadContext={{ languageCode, bookSlug, bookName, chapter }}
            iconSize={ReadingLayout.toolbarActionIconSize}
            hitSize={ReadingLayout.toolbarHitSize}
            audioOnly
          />
          <SettingsToolbarButton iconSize={28} hitSize={ReadingLayout.toolbarHitSize} />
        </View>
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
    height: ReadingLayout.toolbarHeight,
    paddingHorizontal: ReadingLayout.toolbarPaddingH,
    paddingTop: ReadingLayout.toolbarPaddingTop,
    paddingBottom: ReadingLayout.toolbarPaddingV,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: ReadingLayout.toolbarHitSize,
    paddingHorizontal: ReadingLayout.padding - ReadingLayout.toolbarPaddingH,
    borderRadius: 8,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ReadingLayout.toolbarTrailingGap,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
