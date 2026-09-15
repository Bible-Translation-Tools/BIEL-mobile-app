import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReadingLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChapterUnavailablePlaceholderProps = {
  fill?: boolean;
};

const PLACEHOLDER_TITLE = 'Genesis 1';
const PLACEHOLDER_HEADING = 'The Creation of the World';
const PLACEHOLDER_BODY = [
  'In the beginning God created the heavens and the earth. The earth was formless and empty, and darkness was over the surface of the deep. The Spirit of God was hovering over the waters.',
  'And God said, “Let there be light,” and there was light. God saw that the light was good, and he separated the light from the darkness. God called the light “day,” and the darkness he called “night.” And there was evening, and there was morning—the first day.',
  'And God said, “Let there be a vault between the waters to separate water from water.” So God made the vault and separated the water under the vault from the water above it. And it was so. God called the vault “sky.” And there was evening, and there was morning—the second day.',
];

export function ChapterUnavailablePlaceholder({
  fill = false,
}: ChapterUnavailablePlaceholderProps) {
  const theme = useTheme();
  const { t } = useTranslation('reading');

  return (
    <View
      style={[styles.root, fill && styles.fill]}
      accessibilityRole="alert"
      accessibilityLabel={`${t('chapterUnavailable')}. ${t('chapterUnavailableMessage')}`}>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={styles.blurred}>
        <Text style={[styles.chapterTitle, { color: theme.textHeading }]}>
          {PLACEHOLDER_TITLE}
        </Text>
        <View style={styles.scripture}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>{PLACEHOLDER_HEADING}</Text>
          {PLACEHOLDER_BODY.map((line) => (
            <Text key={line} style={[styles.paragraph, { color: theme.text }]}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      <View pointerEvents="none" style={[styles.frost, { backgroundColor: theme.background }]} />

      <View style={styles.overlay}>
        <IconSymbol
          name={{ ios: 'wifi.slash', android: 'wifi-off' }}
          size={48}
          color={theme.iconPrimary}
        />
        <View style={styles.copy}>
          <Text style={[styles.overlayTitle, { color: theme.textHeading }]}>
            {t('chapterUnavailable')}
          </Text>
          <Text style={[styles.overlayMessage, { color: theme.textHeading }]}>
            {t('chapterUnavailableMessage')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    minHeight: 360,
    width: '100%',
    overflow: 'hidden',
    paddingTop: ReadingLayout.padding,
    paddingBottom: 40,
  },
  fill: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  blurred: {
    gap: 16,
    opacity: 0.5,
    // RN New Architecture / web: Gaussian blur matching Figma blur-[9px].
    filter: [{ blur: 9 }],
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  chapterTitle: {
    ...Typography.headingH4,
    fontWeight: '400',
    textAlign: 'center',
  },
  scripture: {
    width: '100%',
    gap: ReadingLayout.sectionGap,
  },
  sectionHeading: {
    ...Typography.bodyMd,
  },
  paragraph: {
    ...Typography.bodyMd,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: ReadingLayout.padding,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  overlayTitle: {
    ...Typography.headingH5,
    fontWeight: '400',
    textAlign: 'center',
  },
  overlayMessage: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 300,
  },
});
