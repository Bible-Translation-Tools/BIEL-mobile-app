import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalePopover } from '@/components/locale/locale-popover';
import { TRANSLATE_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useLocale } from '@/contexts/locale-context';
import { useAnchoredMenu } from '@/hooks/use-anchored-menu';

type InterfaceLanguageButtonProps = {
  textColor: string;
  iconColor: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
};

export function InterfaceLanguageButton({
  textColor,
  iconColor,
  backgroundColor,
  borderColor,
  borderRadius,
}: InterfaceLanguageButtonProps) {
  const { localeLabel } = useLocale();
  const { t } = useTranslation('locale');
  const {
    anchorRef,
    visible: menuVisible,
    anchor: menuAnchor,
    open: openMenu,
    close: closeMenu,
  } = useAnchoredMenu();

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [
            styles.languageButton,
            {
              backgroundColor,
              borderColor,
              borderRadius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={t('changeInterfaceLanguage')}
          accessibilityState={{ expanded: menuVisible }}>
          <View style={styles.languageLabel}>
            <IconSymbol name={TRANSLATE_ICON_NAME} size={16} color={iconColor} />
            <Text style={[styles.languageText, { color: textColor }]} numberOfLines={1}>
              {localeLabel}
            </Text>
          </View>
          <IconSymbol
            name={{
              ios: 'chevron.down',
              android: 'keyboard_arrow_down',
            }}
            size={16}
            color={iconColor}
          />
        </Pressable>
      </View>

      <LocalePopover visible={menuVisible} anchor={menuAnchor} onClose={closeMenu} />
    </>
  );
}

const styles = StyleSheet.create({
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
    borderWidth: 1,
    flexShrink: 1,
  },
  languageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  languageText: {
    ...Typography.bodyMdSemibold,
    flexShrink: 1,
  },
});
