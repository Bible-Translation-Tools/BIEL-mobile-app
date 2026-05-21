import { StyleSheet, View } from 'react-native';

import { HomeLayout } from '@/constants/theme';
import type { LanguageItem } from '@/data/languages';

import { LanguageCardRow } from './language-card-row';

type LanguageListProps = {
  languages: LanguageItem[];
};

export function LanguageList({ languages }: LanguageListProps) {
  return (
    <View style={styles.list}>
      {languages.map((language) => (
        <LanguageCardRow key={language.id} language={language} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: HomeLayout.listGap,
    width: '100%',
  },
});
