import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SystemSettingsMenu } from '@/components/home/system-settings-menu';
import { TextSettingsMenu } from '@/components/reading/text-settings-menu';
import { IconSymbol, SETTINGS_ICON_NAME, type IconSymbolName } from '@/components/ui/icon-symbol';
import { MenuDrawerLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DrawerView = 'menu' | 'system-settings' | 'text-settings';

type SettingsDrawerProps = {
  visible: boolean;
  onClose: () => void;
  showTextSettings?: boolean;
};

type DrawerHeaderProps = {
  title: string;
  onClose: () => void;
  onBack?: () => void;
};

const DOWNLOADS_LIBRARY_ICON: IconSymbolName = {
  ios: 'books.vertical.fill',
  android: 'library-books',
};

const TEXT_SETTINGS_ICON: IconSymbolName = {
  ios: 'textformat.size',
  android: 'format-size',
};

function DrawerHeader({ title, onClose, onBack }: DrawerHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation('settings');

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          style={({ pressed }) => [styles.headerAction, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('menu.back')}>
          <IconSymbol
            name={{ ios: 'chevron.left', android: 'arrow-back' }}
            size={MenuDrawerLayout.closeIconSize}
            color={theme.textHeading}
          />
        </Pressable>
      ) : null}

      <Text
        style={[
          styles.headerTitle,
          { color: theme.textHeading },
          onBack ? styles.headerTitleWithBack : styles.headerTitlePrimary,
        ]}
        numberOfLines={1}>
        {title}
      </Text>

      <Pressable
        style={({ pressed }) => [styles.headerAction, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('menu.close')}>
        <IconSymbol name="close" size={MenuDrawerLayout.closeIconSize} color={theme.textHeading} />
      </Pressable>
    </View>
  );
}

type DrawerMenuItemProps = {
  label: string;
  icon: IconSymbolName;
  iconSize: number;
  onPress?: () => void;
  disabled?: boolean;
};

function DrawerMenuItem({ label, icon, iconSize, onPress, disabled }: DrawerMenuItemProps) {
  const theme = useTheme();

  return (
    <View style={styles.menuItemSection}>
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        ]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled ?? false }}>
        <IconSymbol name={icon} size={iconSize} color={theme.iconPrimary} />
        <Text style={[styles.menuItemLabel, { color: theme.text }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

export function SettingsDrawer({ visible, onClose, showTextSettings = false }: SettingsDrawerProps) {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<DrawerView>('menu');
  const drawerWidth = Math.min(
    MenuDrawerLayout.maxWidth,
    Dimensions.get('window').width * MenuDrawerLayout.widthRatio,
  );

  useEffect(() => {
    if (!visible) {
      setView('menu');
    }
  }, [visible]);

  const handleClose = () => {
    setView('menu');
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={[
            styles.dismissLayer,
            { backgroundColor: `rgba(0,0,0,${MenuDrawerLayout.overlayOpacity})` },
          ]}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('menu.close')}
        />

        <Animated.View
          entering={SlideInRight.duration(250)}
          exiting={SlideOutRight.duration(200)}
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: theme.backgroundElement,
              paddingTop: insets.top,
            },
            styles.drawerShadow,
          ]}>
          {view === 'menu' ? (
            <>
              <DrawerHeader title={t('menu.title')} onClose={handleClose} />
              {showTextSettings ? (
                <DrawerMenuItem
                  label={t('menu.textSettings')}
                  icon={TEXT_SETTINGS_ICON}
                  iconSize={MenuDrawerLayout.textSettingsIconSize}
                  onPress={() => setView('text-settings')}
                />
              ) : null}
              <DrawerMenuItem
                label={t('menu.downloadsLibrary')}
                icon={DOWNLOADS_LIBRARY_ICON}
                iconSize={MenuDrawerLayout.downloadsIconSize}
                disabled
              />
              <DrawerMenuItem
                label={t('menu.systemSettings')}
                icon={SETTINGS_ICON_NAME}
                iconSize={MenuDrawerLayout.settingsIconSize}
                onPress={() => setView('system-settings')}
              />
            </>
          ) : (
            <>
              <DrawerHeader
                title={view === 'text-settings' ? t('menu.textSettings') : t('title')}
                onClose={handleClose}
                onBack={() => setView('menu')}
              />
              <View style={styles.settingsContent}>
                {view === 'text-settings' ? (
                  <TextSettingsMenu embedded />
                ) : (
                  <SystemSettingsMenu embedded />
                )}
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: '100%',
  },
  drawerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3.75 },
    shadowOpacity: 0.19,
    shadowRadius: 11,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MenuDrawerLayout.headerHeight,
    padding: MenuDrawerLayout.headerPadding,
    gap: 8,
  },
  headerTitle: {
    ...Typography.headingH5,
    flex: 1,
  },
  headerTitlePrimary: {
    textAlign: 'left',
  },
  headerTitleWithBack: {
    textAlign: 'left',
  },
  headerAction: {
    width: MenuDrawerLayout.closeIconSize,
    height: MenuDrawerLayout.closeIconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemSection: {
    padding: MenuDrawerLayout.itemPadding,
    gap: MenuDrawerLayout.itemSectionGap,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MenuDrawerLayout.itemRowGap,
  },
  menuItemLabel: {
    ...Typography.headingH6,
    flex: 1,
    fontWeight: '400',
  },
  settingsContent: {
    paddingHorizontal: MenuDrawerLayout.itemPadding,
    paddingBottom: MenuDrawerLayout.itemPadding,
  },
});
