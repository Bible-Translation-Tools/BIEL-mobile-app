import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import {
  SystemSettingsPopover,
  type SystemSettingsAnchor,
} from '@/components/home/system-settings-popover';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';

export type SettingsToolbarButtonRef = {
  close: () => void;
};

type SettingsToolbarButtonProps = {
  iconSize?: number;
  hitSize?: number;
  style?: StyleProp<ViewStyle>;
  onOpen?: () => void;
};

export const SettingsToolbarButton = forwardRef<
  SettingsToolbarButtonRef,
  SettingsToolbarButtonProps
>(function SettingsToolbarButton({ iconSize = 28, hitSize, style, onOpen }, ref) {
  const theme = useTheme();
  const buttonSize = hitSize ?? iconSize;
  const anchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<SystemSettingsAnchor | null>(null);

  const close = useCallback(() => {
    setMenuVisible(false);
    setMenuAnchor(null);
  }, []);

  useImperativeHandle(ref, () => ({ close }), [close]);

  const toggle = useCallback(() => {
    if (menuVisible) {
      close();
      return;
    }

    onOpen?.();
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuVisible(true);
    });
  }, [menuVisible, close, onOpen]);

  return (
    <>
      <Pressable
        ref={anchorRef}
        style={({ pressed }) => [
          styles.button,
          { width: buttonSize, height: buttonSize },
          menuVisible && {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.textLabel,
            borderWidth: 1,
          },
          style,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        accessibilityState={{ expanded: menuVisible }}>
        <IconSymbol
          name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
          size={iconSize}
          color={theme.iconPrimary}
        />
      </Pressable>

      <SystemSettingsPopover visible={menuVisible} anchor={menuAnchor} onClose={close} />
    </>
  );
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
});
