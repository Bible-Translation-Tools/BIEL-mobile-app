import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { DownloadMenuPopover } from '@/components/download/download-menu-popover';
import {
  ChapterDownloadMenu,
  type ChapterDownloadContext,
} from '@/components/reading/chapter-download-menu';
import { DOWNLOAD_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { useAnchoredMenu } from '@/hooks/use-anchored-menu';
import { useTheme } from '@/hooks/use-theme';

type ChapterDownloadToolbarButtonProps = {
  downloadContext: ChapterDownloadContext;
  iconSize: number;
  hitSize?: number;
  audioOnly?: boolean;
};

export function ChapterDownloadToolbarButton({
  downloadContext,
  iconSize,
  hitSize,
  audioOnly = false,
}: ChapterDownloadToolbarButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  const buttonSize = hitSize ?? iconSize;
  const { anchorRef, visible, anchor, open, close } = useAnchoredMenu();

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { width: buttonSize, height: buttonSize, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={t('menu.download')}
          accessibilityState={{ expanded: visible }}>
          <IconSymbol name={DOWNLOAD_ICON_NAME} size={iconSize} color={theme.iconPrimary} />
        </Pressable>
      </View>

      <DownloadMenuPopover visible={visible} anchor={anchor} onClose={close}>
        <ChapterDownloadMenu
          key={`${downloadContext.languageCode}:${downloadContext.bookSlug}:${downloadContext.chapter}`}
          audioOnly={audioOnly}
          {...downloadContext}
        />
      </DownloadMenuPopover>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
});
