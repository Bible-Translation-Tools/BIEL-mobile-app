import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import {
  IconSymbol,
  SUBJECT_ICON_NAME,
  VOLUME_UP_ICON_NAME,
  WORKSPACES_ICON_NAME,
} from '@/components/ui/icon-symbol';
import { DownloadsLibraryLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ContentTypeIndicator } from '@/types/content-type';

type ContentTypeBadgeProps = {
  indicator: ContentTypeIndicator;
};

export function ContentTypeBadge({ indicator }: ContentTypeBadgeProps) {
  const theme = useTheme();
  const { t } = useTranslation('library');
  const isMixed = indicator === 'mixed';
  const backgroundColor = isMixed ? theme.badgeMixedBackground : theme.badgeBothBackground;
  const foregroundColor = isMixed ? theme.badgeMixedForeground : theme.badgeBothForeground;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <View style={styles.icons}>
        {indicator === 'both' ? (
          <>
            <IconSymbol name={SUBJECT_ICON_NAME} size={DownloadsLibraryLayout.badgeIconSize} color={foregroundColor} />
            <IconSymbol name={VOLUME_UP_ICON_NAME} size={DownloadsLibraryLayout.badgeIconSize} color={foregroundColor} />
          </>
        ) : indicator === 'text' ? (
          <IconSymbol name={SUBJECT_ICON_NAME} size={DownloadsLibraryLayout.badgeIconSize} color={foregroundColor} />
        ) : indicator === 'audio' ? (
          <IconSymbol name={VOLUME_UP_ICON_NAME} size={DownloadsLibraryLayout.badgeIconSize} color={foregroundColor} />
        ) : (
          <IconSymbol name={WORKSPACES_ICON_NAME} size={DownloadsLibraryLayout.badgeIconSize} color={foregroundColor} />
        )}
      </View>
      <Text style={[styles.label, { color: foregroundColor }]}>
        {t(`content.${indicator}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DownloadsLibraryLayout.badgeGap,
    paddingHorizontal: DownloadsLibraryLayout.badgePaddingH,
    paddingVertical: DownloadsLibraryLayout.badgePaddingV,
    borderRadius: DownloadsLibraryLayout.badgeRadius,
    flexShrink: 0,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
