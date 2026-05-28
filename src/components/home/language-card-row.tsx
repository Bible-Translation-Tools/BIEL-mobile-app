import { memo, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DownloadMenuPopover,
  type DownloadMenuAnchor,
} from '@/components/download/download-menu-popover';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { HomeLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageItem } from '@/types/language';

type LanguageCardRowProps = {
  language: LanguageItem;
  onPress?: () => void;
  onDownloadPress?: () => void;
};

export const LanguageCardRow = memo(function LanguageCardRow({
  language,
  onPress,
  onDownloadPress,
}: LanguageCardRowProps) {
  const theme = useTheme();
  const isDownloaded = language.downloadStatus === 'downloaded';
  const downloadAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DownloadMenuAnchor | null>(null);

  const openDownloadMenu = useCallback(() => {
    downloadAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuVisible(true);
    });
  }, []);

  const closeDownloadMenu = useCallback(() => {
    setMenuVisible(false);
    setMenuAnchor(null);
  }, []);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
    styles.cardShadow,
  ];

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [cardStyle, styles.mainCard, { opacity: pressed ? 0.9 : 1 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${language.name}`}>
        <View style={styles.mainContent}>
          <View style={styles.titleLine}>
            <Text style={[styles.languageName, { color: theme.text }]} numberOfLines={1}>
              {language.nationalName}
            </Text>
            <View style={styles.mediaIcons}>
              {language.hasAudio && (
                <IconSymbol
                  name={{ ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }}
                  size={18}
                  color={theme.iconTertiary}
                />
              )}
              {language.hasText && (
                <IconSymbol
                  name={{
                    ios: 'text.alignleft',
                    android: 'format_align_left',
                    web: 'format_align_left',
                  }}
                  size={18}
                  color={theme.iconTertiary}
                />
              )}
            </View>
          </View>
          <Text style={[styles.languageCode, { color: theme.textSecondary }]} numberOfLines={1}>
            {`${language.code} - ${language.name}`}
          </Text>
        </View>
        <IconSymbol
          name={{ ios: 'chevron.right', android: 'keyboard_arrow_right', web: 'keyboard_arrow_right' }}
          size={24}
          color={theme.iconTertiary}
        />
      </Pressable>

      <View ref={downloadAnchorRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [
            cardStyle,
            styles.downloadCard,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={openDownloadMenu}
          accessibilityRole="button"
          accessibilityLabel={
            isDownloaded ? `${language.name} downloaded` : `Download ${language.name}`
          }>
          <IconSymbol
            name={
              isDownloaded
                ? { ios: 'checkmark.circle.fill', android: 'download_done', web: 'download_done' }
                : { ios: 'arrow.down.circle', android: 'file_download', web: 'file_download' }
            }
            size={28}
            color={isDownloaded ? theme.iconSuccess : theme.iconPrimary}
          />
        </Pressable>
      </View>

      <DownloadMenuPopover
        visible={menuVisible}
        anchor={menuAnchor}
        onClose={closeDownloadMenu}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.rowGap,
    width: '100%',
  },
  card: {
    borderRadius: HomeLayout.cardRadius,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  mainCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: HomeLayout.cardPaddingH,
    paddingVertical: HomeLayout.cardPaddingV,
    minWidth: 0,
  },
  mainContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HomeLayout.headerGap,
  },
  languageName: {
    ...Typography.headingH6,
    flexShrink: 1,
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
  },
  languageCode: {
    ...Typography.bodySm,
  },
  downloadCard: {
    width: HomeLayout.downloadButtonSize,
    height: HomeLayout.downloadButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
