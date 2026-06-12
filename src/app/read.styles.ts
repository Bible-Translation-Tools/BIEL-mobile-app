import { StyleSheet } from 'react-native';

import { ReadingLayout } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: ReadingLayout.padding,
    paddingTop: ReadingLayout.padding,
    paddingBottom: ReadingLayout.scrollBottomInset,
  },
  footerLoader: {
    paddingVertical: ReadingLayout.contentGap,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: ReadingLayout.padding,
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
