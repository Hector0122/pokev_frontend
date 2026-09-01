import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useTrainers } from '../hooks/queries/useTrainers';
import { useCard, useUpdateCard } from '../hooks/queries/useCards';
import Button from '../components/Button';
import QueryState from '../components/QueryState';
import CardFieldsForm, { EMPTY_CARD_FORM_VALUES, type CardFormValues } from '../components/CardFieldsForm';
import type { RootStackParamList } from '../navigation/types';
import type { Card, UpdateCardInput } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCard'>;

function valuesFromCard(card: Card): CardFormValues {
  return {
    setName: card.setName,
    cardNumber: card.cardNumber,
    rarity: card.rarity ?? '',
    cardType: card.cardType ?? '',
    hp: card.hp !== null ? String(card.hp) : '',
    attacks: card.attacks ?? [],
    year: card.year !== null ? String(card.year) : '',
    language: card.language ?? '',
    variant: card.variant ?? '',
    imageUrl: card.imageUrl ?? '',
    quantity: String(card.quantity),
    estimatedValueUsd: card.estimatedValueUsd ?? '',
    acquiredAt: card.acquiredAt ?? '',
    acquiredWithId: card.acquiredWithId,
    memory: card.memory ?? '',
    favoriteTrainerRoles: [],
  };
}

/** Editar carta (§6, §22 V0.1) — todos los campos excepto el Pokémon. */
export default function EditCardScreen({ route, navigation }: Props) {
  const { cardId } = route.params;
  const { colors, spacing, type } = useTheme();
  const cardQuery = useCard(cardId);
  const trainersQuery = useTrainers();
  const updateCard = useUpdateCard();

  const [values, setValues] = useState<CardFormValues>(EMPTY_CARD_FORM_VALUES);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (cardQuery.data) {
      setValues(valuesFromCard(cardQuery.data));
    }
  }, [cardQuery.data]);

  function updateValues(patch: Partial<CardFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (saving || !values.setName.trim() || !values.cardNumber.trim()) return;
    setSaving(true);
    setSaveError(null);

    const input: UpdateCardInput = {
      setName: values.setName.trim(),
      cardNumber: values.cardNumber.trim(),
      rarity: values.rarity.trim() || undefined,
      cardType: values.cardType.trim() || undefined,
      hp: values.hp ? Number(values.hp) : undefined,
      attacks: values.attacks.filter((a) => a.name.trim()),
      year: values.year ? Number(values.year) : undefined,
      language: values.language.trim() || undefined,
      variant: values.variant.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      quantity: Number(values.quantity) || 1,
      estimatedValueUsd: values.estimatedValueUsd ? Number(values.estimatedValueUsd) : undefined,
      acquiredAt: values.acquiredAt || undefined,
      acquiredWithId: values.acquiredWithId ?? undefined,
      memory: values.memory.trim() || undefined,
    };

    try {
      await updateCard.mutateAsync({ id: cardId, input });
      navigation.goBack();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const canSave = values.setName.trim().length > 0 && values.cardNumber.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ fontSize: 24, color: colors.text }}>←</Text>
        </Pressable>
        <Text style={{ ...type.h1, color: colors.text }}>✏️ Editar carta</Text>
      </View>

      <QueryState isLoading={cardQuery.isLoading} error={cardQuery.error} onRetry={() => cardQuery.refetch()}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge }}>
          <CardFieldsForm values={values} onChange={updateValues} trainers={trainersQuery.data ?? []} />

          {saveError ? <Text style={{ ...type.bodySm, color: colors.danger }}>{saveError}</Text> : null}

          <Button
            title={saving ? 'Guardando…' : 'Guardar cambios'}
            onPress={handleSave}
            disabled={!canSave || saving}
            loading={saving}
          />
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}
