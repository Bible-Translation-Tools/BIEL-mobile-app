import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BookLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Testament } from '@/types/book';

type TestamentTabsProps = {
  activeTestament: Testament;
  onTestamentChange: (testament: Testament) => void;
};

export function TestamentTabs({ activeTestament, onTestamentChange }: TestamentTabsProps) {
  const theme = useTheme();

  return (
    <View style={styles.tabs}>
      <TabButton
        label="Old Testament"
        isActive={activeTestament === 'old'}
        activeColor={theme.tabActive}
        inactiveColor={theme.tabInactive}
        onPress={() => onTestamentChange('old')}
      />
      <TabButton
        label="New Testament"
        isActive={activeTestament === 'new'}
        activeColor={theme.tabActive}
        inactiveColor={theme.tabInactive}
        onPress={() => onTestamentChange('new')}
      />
    </View>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
};

function TabButton({ label, isActive, activeColor, inactiveColor, onPress }: TabButtonProps) {
  return (
    <Pressable
      style={[styles.tab, isActive && { borderBottomColor: activeColor }]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}>
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? activeColor : inactiveColor },
          isActive && styles.tabLabelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderBottomWidth: BookLayout.tabBorderWidth,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 20,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
