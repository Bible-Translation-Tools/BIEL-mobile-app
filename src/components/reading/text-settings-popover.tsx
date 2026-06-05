import { memo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutRectangle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { TextSettingsMenu } from '@/components/reading/text-settings-menu';
import { DownloadMenuLayout, TextSettingsLayout } from '@/constants/theme';

export type TextSettingsAnchor = Pick<LayoutRectangle, 'x' | 'y' | 'width' | 'height'>;

type TextSettingsPopoverProps = {
  visible: boolean;
  anchor: TextSettingsAnchor | null;
  onClose: () => void;
};

const MENU_ESTIMATED_HEIGHT = 220;

type MenuPosition = {
  top: number;
  left: number;
};

function computeMenuPosition(anchor: TextSettingsAnchor): MenuPosition {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const horizontalPadding = DownloadMenuLayout.screenPadding;
  const menuWidth = Math.min(
    TextSettingsLayout.menuWidth,
    screenWidth - horizontalPadding * 2,
  );

  const anchorCenterX = anchor.x + anchor.width / 2;
  let left = anchorCenterX - menuWidth / 2;
  left = Math.max(horizontalPadding, Math.min(left, screenWidth - horizontalPadding - menuWidth));

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
    : anchor.y + anchor.height + DownloadMenuLayout.anchorGap + DownloadMenuLayout.menuTopOffset;

  return { top, left };
}

export const TextSettingsPopover = memo(function TextSettingsPopover({
  visible,
  anchor,
  onClose,
}: TextSettingsPopoverProps) {
  const { t } = useTranslation('reading');

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
          accessibilityLabel={t('closeTextSettings')}
        />
        <View
          style={[
            styles.menuContainer,
            {
              top: position.top,
              left: position.left,
            },
          ]}>
          <TextSettingsMenu />
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
