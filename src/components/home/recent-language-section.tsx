import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AccordionGroupHeader } from '@/components/ui/accordion-group-header';
import { HomeLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageItem } from '@/types/language';

import { LanguageCardRow } from './language-card-row';

type RecentLanguageSectionProps = {
  language: LanguageItem;
  expanded: boolean;
  onToggle: () => void;
  onLanguagePress: (language: LanguageItem) => void;
  onDownloadStatusChange?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** "Recent" heading over the last language picked on Home, then a divider before the full list. */
export function RecentLanguageSection({
  language,
  expanded,
  onToggle,
  onLanguagePress,
  onDownloadStatusChange,
  onLayout,
}: RecentLanguageSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.group}>
        <AccordionGroupHeader
          title={t('recent')}
          expanded={expanded}
          onPress={onToggle}
          titleStyle={styles.title}
        />
        {expanded ? (
          <LanguageCardRow
            language={language}
            onPress={() => onLanguagePress(language)}
            onDownloadStatusChange={onDownloadStatusChange}
          />
        ) : null}
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
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
});
