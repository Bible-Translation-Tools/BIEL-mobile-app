import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  type ListRenderItem,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { HomeLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LanguageItem } from '@/types/language';

import { LanguageCardRow } from './language-card-row';

/** Row height (70px download card) + gap between rows */
const ROW_HEIGHT = HomeLayout.downloadButtonSize;
const ITEM_STRIDE = ROW_HEIGHT + HomeLayout.listGap;

type LanguageListProps = {
  languages: LanguageItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onLanguagePress?: (language: LanguageItem) => void;
  onDownloadStatusChange?: () => void;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

type LanguageListEmptyProps = {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

function LanguageListEmpty({ loading, error, onRetry }: LanguageListEmptyProps) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const { t: tc } = useTranslation('common');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.iconPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{error}</Text>
        {onRetry ? (
          <Text style={[styles.retry, { color: theme.text }]} onPress={onRetry}>
            {tc('retry')}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{t('noLanguagesFound')}</Text>
    </View>
  );
}

export function LanguageList({
  languages,
  loading = false,
  error = null,
  onRetry,
  onLanguagePress,
  onDownloadStatusChange,
  ListHeaderComponent,
  contentContainerStyle,
}: LanguageListProps) {
  const renderItem: ListRenderItem<LanguageItem> = useCallback(
    ({ item }) => (
      <LanguageCardRow
        language={item}
        onPress={() => {
          Keyboard.dismiss();
          onLanguagePress?.(item);
        }}
        onDownloadStatusChange={onDownloadStatusChange}
      />
    ),
    [onDownloadStatusChange, onLanguagePress],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<LanguageItem> | null | undefined, index: number) => ({
      length: ITEM_STRIDE,
      offset: ITEM_STRIDE * index,
      index,
    }),
    [],
  );

  return (
    <FlatList
      style={styles.list}
      data={languages}
      renderItem={renderItem}
      keyExtractor={(item) => item.code}
      getItemLayout={getItemLayout}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <LanguageListEmpty loading={loading} error={error} onRetry={onRetry} />
      }
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={12}
      maxToRenderPerBatch={16}
      windowSize={7}
      updateCellsBatchingPeriod={50}
    />
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: HomeLayout.padding,
    paddingBottom: 40,
  },
  separator: {
    height: HomeLayout.listGap,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  retry: {
    fontSize: 16,
    fontWeight: '600',
  },
});
