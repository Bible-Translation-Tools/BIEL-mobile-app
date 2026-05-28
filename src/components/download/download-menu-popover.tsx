import { memo, type ComponentProps } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutRectangle,
} from 'react-native';

import { DownloadMenuLayout } from '@/constants/theme';

import { DownloadMenu } from './download-menu';

export type DownloadMenuAnchor = Pick<LayoutRectangle, 'x' | 'y' | 'width' | 'height'>;

type DownloadMenuPopoverProps = {
  visible: boolean;
  anchor: DownloadMenuAnchor | null;
  onClose: () => void;
  menuProps?: ComponentProps<typeof DownloadMenu>;
};

const MENU_ESTIMATED_HEIGHT = 231;

type MenuPosition = {
  top: number;
  right: number;
  width: number;
};

function computeMenuPosition(anchor: DownloadMenuAnchor): MenuPosition {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const horizontalPadding = DownloadMenuLayout.screenPadding;
  const menuWidth = Math.min(
    DownloadMenuLayout.menuMaxWidth,
    screenWidth - horizontalPadding * 2,
  );
  const anchorRight = anchor.x + anchor.width;
  const right = Math.max(
    horizontalPadding,
    screenWidth - anchorRight,
  );

  const spaceBelow =
    screenHeight - (anchor.y + anchor.height + DownloadMenuLayout.anchorGap);
  const spaceAbove = anchor.y - DownloadMenuLayout.anchorGap;
  const showAbove =
    spaceBelow < MENU_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

  const top = showAbove
    ? Math.max(
        horizontalPadding,
        anchor.y - DownloadMenuLayout.anchorGap - MENU_ESTIMATED_HEIGHT,
      )
    : anchor.y + anchor.height + DownloadMenuLayout.anchorGap;

  return { top, right, width: menuWidth };
}

export const DownloadMenuPopover = memo(function DownloadMenuPopover({
  visible,
  anchor,
  onClose,
  menuProps,
}: DownloadMenuPopoverProps) {
  if (!visible || anchor == null) {
    return null;
  }

  const position = computeMenuPosition(anchor);

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
          accessibilityLabel="Close download menu"
        />
        <View
          style={[
            styles.menuContainer,
            {
              top: position.top,
              right: position.right,
              width: position.width,
            },
          ]}>
          <DownloadMenu {...menuProps} />
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
  menuContainer: {
    position: 'absolute',
  },
});
