import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutRectangle,
} from 'react-native';

import { LibraryFilterMenu } from '@/components/download/library-filter-menu';
import { DownloadMenuLayout, DownloadsLibraryLayout } from '@/constants/theme';
import type { LibraryContentFilter } from '@/types/content-type';

export type LibraryFilterAnchor = Pick<LayoutRectangle, 'x' | 'y' | 'width' | 'height'>;

type LibraryFilterPopoverProps = {
  visible: boolean;
  anchor: LibraryFilterAnchor | null;
  value: LibraryContentFilter;
  onSelect: (value: LibraryContentFilter) => void;
  onClose: () => void;
};

const MENU_ESTIMATED_HEIGHT = DownloadsLibraryLayout.filterMenuEstimatedHeight;
const MENU_WIDTH = DownloadsLibraryLayout.filterMenuWidth;

export const LibraryFilterPopover = memo(function LibraryFilterPopover({
  visible,
  anchor,
  value,
  onSelect,
  onClose,
}: LibraryFilterPopoverProps) {
  const { t } = useTranslation('library');

  if (!visible || anchor == null) {
    return null;
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const padding = DownloadMenuLayout.screenPadding;
  const anchorRight = anchor.x + anchor.width;
  const right = Math.max(padding, screenWidth - anchorRight);
  const spaceBelow = screenHeight - (anchor.y + anchor.height + DownloadMenuLayout.anchorGap);
  const showAbove = spaceBelow < MENU_ESTIMATED_HEIGHT;
  const top = showAbove
    ? Math.max(padding, anchor.y - DownloadMenuLayout.anchorGap - MENU_ESTIMATED_HEIGHT)
    : anchor.y + anchor.height + DownloadMenuLayout.anchorGap;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          style={styles.dismissLayer}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('closeFilter')}
        />
        <View style={[styles.menuWrap, { top, right, width: MENU_WIDTH }]}>
          <LibraryFilterMenu
            value={value}
            onSelect={(next) => {
              onSelect(next);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  menuWrap: {
    position: 'absolute',
  },
});
