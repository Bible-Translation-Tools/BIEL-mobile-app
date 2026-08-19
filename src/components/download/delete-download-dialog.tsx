import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DELETE_ICON_NAME, IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmDialogLayout, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DeleteDownloadDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteDownloadDialog({
  visible,
  onCancel,
  onConfirm,
}: DeleteDownloadDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation('download');

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <Pressable
          style={[
            styles.dismissLayer,
            { backgroundColor: `rgba(0,0,0,${ConfirmDialogLayout.overlayOpacity})` },
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t('confirmDeleteCancel')}
        />
        <View
          style={[
            styles.dialog,
            styles.dialogShadow,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert">
          <View style={styles.content}>
            <IconSymbol
              name={DELETE_ICON_NAME}
              size={ConfirmDialogLayout.iconSize}
              color={theme.iconDanger}
            />
            <Text style={[styles.title, { color: theme.text }]}>{t('confirmDeleteTitle')}</Text>
            <View style={styles.body}>
              <Text style={[styles.bodyText, { color: theme.text }]}>
                {t('confirmDeleteMessage')}
              </Text>
              <Text style={[styles.bodyText, { color: theme.text }]}>
                {t('confirmDeleteQuestion')}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.iconDanger,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('confirmDeleteAction')}>
              <Text style={[styles.buttonLabel, { color: theme.iconDanger }]}>
                {t('confirmDeleteAction')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.tabActive,
                  borderColor: theme.tabActive,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t('confirmDeleteCancel')}>
              <Text style={[styles.buttonLabel, { color: '#ffffff' }]}>
                {t('confirmDeleteCancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: ConfirmDialogLayout.width,
    maxWidth: '90%',
    borderRadius: ConfirmDialogLayout.radius,
    borderWidth: 1,
    paddingHorizontal: ConfirmDialogLayout.paddingH,
    paddingVertical: ConfirmDialogLayout.paddingV,
    gap: ConfirmDialogLayout.gap,
    alignItems: 'flex-end',
  },
  dialogShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 8,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: ConfirmDialogLayout.contentGap,
  },
  title: {
    ...Typography.headingH6,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  body: {
    width: '100%',
    gap: ConfirmDialogLayout.paragraphGap,
  },
  bodyText: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: ConfirmDialogLayout.actionsGap,
  },
  button: {
    padding: ConfirmDialogLayout.buttonPadding,
    borderRadius: ConfirmDialogLayout.buttonRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
});
