import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AccordionLayout, HomeLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AccordionGroupHeaderProps = {
  title: string;
  expanded: boolean;
  onPress: () => void;
  /** Shown but not toggleable, e.g. while a search forces every group open. */
  disabled?: boolean;
};

/** Bold title and chevron that toggles a group of rows, e.g. a language or a testament. */
export function AccordionGroupHeader({
  title,
  expanded,
  onPress,
  disabled = false,
}: AccordionGroupHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation('books');

  return (
    <Pressable
      style={({ pressed }) => [styles.header, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        expanded
          ? t('accessibility.collapse', { name: title })
          : t('accessibility.expand', { name: title })
      }
      accessibilityState={{ expanded, disabled }}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <IconSymbol
        name={
          expanded
            ? { ios: 'chevron.up', android: 'keyboard_arrow_up' }
            : { ios: 'chevron.down', android: 'keyboard_arrow_down' }
        }
        size={28}
        color={theme.iconTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: HomeLayout.rowGap,
  },
  title: {
    fontSize: AccordionLayout.titleSize,
    lineHeight: AccordionLayout.titleLineHeight,
    fontWeight: '700',
    flex: 1,
  },
});
