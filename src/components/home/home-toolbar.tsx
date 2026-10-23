import { StyleSheet, View } from 'react-native';

import { SettingsToolbarButton } from '@/components/settings/settings-toolbar-button';
import { HomeLayout } from '@/constants/theme';

export function HomeToolbar() {
  return (
    <View style={styles.toolbar}>
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
