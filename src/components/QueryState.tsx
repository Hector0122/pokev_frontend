import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Envoltorio chico para no repetir loading/error boilerplate en cada
 * pantalla — mensajes siempre en español y amigables (nunca un error crudo
 * ni un stack trace), ver local-collection-storage spec.
 */
export default function QueryState({ isLoading, error, onRetry, children }: Props) {
  const { colors, spacing, type } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <LoadingSpinner size={56} />
      </View>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Algo salió mal. Probá de nuevo.';
    return (
      <View style={[styles.centered, { padding: spacing.xxl, gap: spacing.md }]}>
        <Text style={styles.icon}>📡</Text>
        <Text style={[styles.textCenter, { ...type.body, color: colors.textSecondary }]}>{message}</Text>
        {onRetry ? <Button title="Reintentar" onPress={onRetry} variant="ghost" /> : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 40 },
  textCenter: { textAlign: 'center' },
});
