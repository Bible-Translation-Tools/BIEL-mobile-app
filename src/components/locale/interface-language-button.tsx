import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  LocalePopover,
  type LocalePopoverAnchor,
} from '@/components/locale/locale-popover';
import { TRANSLATE_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { useLocale } from '@/contexts/locale-context';
import { Typography } from '@/constants/theme';

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
  const anchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<LocalePopoverAnchor | null>(null);

  const openMenu = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuVisible(true);
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    setMenuAnchor(null);
  }, []);

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
            <IconSymbol
              name={TRANSLATE_ICON_NAME}
              size={16}
              color={iconColor}
            />
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
