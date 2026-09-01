import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Button from './Button';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Algo salió mal. Probá de nuevo.';
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
          gap: spacing.md,
        }}
      >
        <Text style={{ fontSize: 40 }}>📡</Text>
        <Text style={{ ...type.body, color: colors.textSecondary, textAlign: 'center' }}>{message}</Text>
        {onRetry ? <Button title="Reintentar" onPress={onRetry} variant="ghost" /> : null}
      </View>
    );
  }

  return <>{children}</>;
}
