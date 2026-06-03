import { StyleSheet, View } from 'react-native';

import { InterfaceLanguageButton } from '@/components/locale/interface-language-button';
import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { HomeLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HomeToolbar() {
  const theme = useTheme();

  return (
    <View style={styles.toolbar}>
      <InterfaceLanguageButton
        textColor={theme.text}
        iconColor={theme.iconPrimary}
        backgroundColor={theme.backgroundElement}
        borderColor={theme.border}
        borderRadius={HomeLayout.cardRadius}
      />

      <SettingsToolbarButton iconSize={28} hitSize={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: HomeLayout.padding,
    paddingVertical: HomeLayout.padding,
  },
});
