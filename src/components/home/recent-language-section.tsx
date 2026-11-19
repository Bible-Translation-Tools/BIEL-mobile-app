import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { AccordionLayout, HomeLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageItem } from '@/types/language';

import { LanguageCardRow } from './language-card-row';

type RecentLanguageSectionProps = {
  language: LanguageItem;
  onLanguagePress: (language: LanguageItem) => void;
  onDownloadStatusChange?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** "Recent" heading over the last language picked on Home, then a divider before the full list. */
export function RecentLanguageSection({
  language,
  onLanguagePress,
  onDownloadStatusChange,
  onLayout,
}: RecentLanguageSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.group}>
        {/* Plain heading, not an accordion: the section never holds more than one row. */}
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {t('recent')}
        </Text>
        <LanguageCardRow
          language={language}
          onPress={() => onLanguagePress(language)}
          onDownloadStatusChange={onDownloadStatusChange}
        />
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: HomeLayout.contentGap,
    paddingBottom: HomeLayout.contentGap,
  },
  group: {
    gap: HomeLayout.headerGap,
  },
  title: {
    fontSize: AccordionLayout.titleSize,
    lineHeight: AccordionLayout.titleLineHeight,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
});
