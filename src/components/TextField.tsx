import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  required?: boolean;
}

/** Input de texto estándar del flujo de agregar/editar carta (§6, §8). */
export default function TextField({ label, required, style, ...inputProps }: Props) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text style={{ ...type.label, color: colors.textSecondary }}>
        {label.toUpperCase()}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            ...type.body,
            color: colors.text,
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
          },
          style,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingVertical: 10 },
});
