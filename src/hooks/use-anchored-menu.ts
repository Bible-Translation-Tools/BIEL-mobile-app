import { useCallback, useRef, useState } from 'react';
import { Keyboard, type LayoutRectangle, type View } from 'react-native';

export type MenuAnchor = Pick<LayoutRectangle, 'x' | 'y' | 'width' | 'height'>;

type UseAnchoredMenuOptions = {
  /** Dismiss the soft keyboard before measuring, so the menu anchors to the settled layout. */
  dismissKeyboard?: boolean;
};

/**
 * State for a popover menu anchored to a view: attach `anchorRef` to a
 * `collapsable={false}` wrapper, call `open` to measure it and show the menu.
 */
export function useAnchoredMenu({ dismissKeyboard = false }: UseAnchoredMenuOptions = {}) {
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  const open = useCallback(() => {
    if (dismissKeyboard) {
      Keyboard.dismiss();
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setVisible(true);
    });
  }, [dismissKeyboard]);

  const close = useCallback(() => {
    setVisible(false);
    setAnchor(null);
  }, []);

  return { anchorRef, visible, anchor, open, close };
}
