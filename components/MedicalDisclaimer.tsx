import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

export default function MedicalDisclaimer() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      accessible
      accessibilityLabel="medical-disclaimer"
    >
      <Text style={[styles.text, { color: colors.textMuted }]}>
        {t(
          'disclaimer.medical',
          'Bluom provides general wellness information only. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.'
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  text: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
