import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import TextField from './TextField';
import AppIcon from './AppIcon';
import type { CardAttack, Trainer, TrainerRole } from '../api/types';

export interface CardFormValues {
  setName: string;
  cardNumber: string;
  rarity: string;
  cardType: string;
  hp: string;
  attacks: CardAttack[];
  year: string;
  language: string;
  variant: string;
  imageUrl: string;
  quantity: string;
  estimatedValueUsd: string;
  acquiredAt: string;
  acquiredWithId: string | null;
  memory: string;
  favoriteTrainerRoles: TrainerRole[];
}

export const EMPTY_CARD_FORM_VALUES: CardFormValues = {
  setName: '',
  cardNumber: '',
  rarity: '',
  cardType: '',
  hp: '',
  attacks: [],
  year: '',
  language: '',
  variant: '',
  imageUrl: '',
  quantity: '1',
  estimatedValueUsd: '',
  acquiredAt: '',
  acquiredWithId: null,
  memory: '',
  favoriteTrainerRoles: [],
};

interface Props {
  values: CardFormValues;
  onChange: (patch: Partial<CardFormValues>) => void;
  trainers: Trainer[];
  /** La edición no cambia de Pokémon (§6) y los favoritos se manejan aparte (§7.1) — se ocultan en ese caso. */
  showFavorites?: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing, type } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ ...type.h2, color: colors.text }}>{title}</Text>
      {children}
    </View>
  );
}

function Stepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors, spacing, radius, type, fontFamily } = useTheme();
  const numeric = Math.max(1, Number(value) || 1);
  return (
    <View style={[styles.rowCenter, { gap: spacing.md }]}>
      <Pressable
        onPress={() => onChange(String(Math.max(1, numeric - 1)))}
        style={[styles.stepperButton, { borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }]}
      >
        <Text style={{ ...type.h1, color: colors.text }}>–</Text>
      </Pressable>
      <Text style={[styles.stepperValue, { fontSize: type.h1.fontSize, fontFamily: fontFamily.mono, color: colors.text }]}>
        {numeric}
      </Text>
      <Pressable
        onPress={() => onChange(String(numeric + 1))}
        style={[styles.stepperButton, { borderRadius: radius.sm, backgroundColor: colors.primarySoft }]}
      >
        <Text style={{ ...type.h1, color: colors.primary }}>+</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, spacing, radius, type } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surfaceAlt,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.bold, selected ? styles.chipTextSelected : { color: colors.text }, { ...type.bodySm }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Campos de una carta (§8), compartidos entre Agregar y Editar (§6). El
 * flujo del spec es corto (Pokémon → carta → cantidad → favorita opcional →
 * guardar) — rareza/tipo/HP/ataques/año/idioma/variante/valor/"conseguida
 * con" son metadata de coleccionista que se fue agregando encima y hacía
 * sentir el formulario "muy complicado" para agregar rápido; quedan atrás
 * de "+ más detalles" en vez de siempre visibles.
 */
export default function CardFieldsForm({ values, onChange, trainers, showFavorites }: Props) {
  const { colors, spacing, radius, type } = useTheme();
  const [showDetails, setShowDetails] = React.useState(false);

  function updateAttack(index: number, patch: Partial<CardAttack>) {
    const next = [...values.attacks];
    next[index] = { ...next[index], ...patch };
    onChange({ attacks: next });
  }

  function removeAttack(index: number) {
    onChange({ attacks: values.attacks.filter((_, i) => i !== index) });
  }

  function toggleFavoriteRole(role: TrainerRole) {
    const has = values.favoriteTrainerRoles.includes(role);
    onChange({
      favoriteTrainerRoles: has
        ? values.favoriteTrainerRoles.filter((r) => r !== role)
        : [...values.favoriteTrainerRoles, role],
    });
  }

  return (
    <View style={{ gap: spacing.xl }}>
      <Section title="Datos básicos">
        <TextField
          label="Expansión / set"
          required
          value={values.setName}
          onChangeText={(setName) => onChange({ setName })}
          placeholder="Ej. Scarlet & Violet"
        />
        <TextField
          label="Número"
          required
          value={values.cardNumber}
          onChangeText={(cardNumber) => onChange({ cardNumber })}
          placeholder="Ej. 025"
        />
      </Section>

      <Section title="Cantidad">
        <Stepper value={values.quantity} onChange={(quantity) => onChange({ quantity })} />
      </Section>

      {showFavorites ? (
        <View style={{ gap: spacing.xxs }}>
          <Text style={{ ...type.label, color: colors.textSecondary }}>MARCAR COMO FAVORITA DE</Text>
          <View style={[styles.wrapRow, { gap: spacing.xs }]}>
            {trainers.map((trainer) => (
              <Chip
                key={trainer.id}
                label={`${trainer.name} ❤️`}
                selected={values.favoriteTrainerRoles.includes(trainer.role)}
                onPress={() => toggleFavoriteRole(trainer.role)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label="Recuerdo (opcional)"
        value={values.memory}
        onChangeText={(memory) => onChange({ memory })}
        placeholder="Ej. Fue la primera carta que encontramos juntos"
        multiline
        numberOfLines={3}
        style={styles.memoryField}
      />

      <Pressable onPress={() => setShowDetails((v) => !v)} style={styles.flexStart}>
        <Text style={[styles.bold, { ...type.bodySm, color: colors.primary }]}>
          {showDetails ? '– Ocultar detalles' : '+ Más detalles (opcional)'}
        </Text>
      </Pressable>

      {showDetails ? (
        <>
          <Section title="Detalles de la carta">
            <TextField label="Rareza" value={values.rarity} onChangeText={(rarity) => onChange({ rarity })} />
            <TextField
              label="Tipo de carta"
              value={values.cardType}
              onChangeText={(cardType) => onChange({ cardType })}
              placeholder="Ej. ex, V, Illustration Rare"
            />
            <TextField label="HP" value={values.hp} onChangeText={(hp) => onChange({ hp })} keyboardType="number-pad" />
            <TextField label="Año" value={values.year} onChangeText={(year) => onChange({ year })} keyboardType="number-pad" />
            <TextField label="Idioma" value={values.language} onChangeText={(language) => onChange({ language })} />
            <TextField label="Variante" value={values.variant} onChangeText={(variant) => onChange({ variant })} />
            <TextField
              label="Imagen de la carta (URL, opcional)"
              value={values.imageUrl}
              onChangeText={(imageUrl) => onChange({ imageUrl })}
              autoCapitalize="none"
              placeholder="Si la dejás vacía, usamos la imagen del Pokémon"
            />
          </Section>

          <Section title="Ataques">
            {values.attacks.map((attack, index) => (
              <View
                key={index}
                style={[
                  styles.attackRow,
                  { gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm },
                ]}
              >
                <View style={[styles.flex1, { gap: spacing.xxs }]}>
                  <TextField
                    label="Nombre"
                    value={attack.name}
                    onChangeText={(name) => updateAttack(index, { name })}
                  />
                  <TextField
                    label="Daño"
                    value={attack.damage ?? ''}
                    onChangeText={(damage) => updateAttack(index, { damage })}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <Pressable onPress={() => removeAttack(index)} style={{ padding: spacing.xs }}>
                  <Text style={styles.removeIcon}>🗑️</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => onChange({ attacks: [...values.attacks, { name: '', damage: '' }] })}
              style={styles.flexStart}
            >
              <Text style={[styles.bold, { ...type.bodySm, color: colors.primary }]}>+ Agregar ataque</Text>
            </Pressable>
          </Section>

          <Section title="Más información">
            <TextField
              label="Valor aproximado (USD, opcional)"
              value={values.estimatedValueUsd}
              onChangeText={(estimatedValueUsd) => onChange({ estimatedValueUsd })}
              keyboardType="decimal-pad"
            />
            <Text style={{ ...type.caption, color: colors.textMuted }}>
              Los precios son aproximados y pueden cambiar — es solo una referencia para papá.
            </Text>

            <View style={{ gap: spacing.xxs }}>
              <View style={[styles.rowCenter, { gap: spacing.xxs }]}>
                <AppIcon name="entrenador" size={16} />
                <Text style={{ ...type.label, color: colors.textSecondary }}>CONSEGUIDA CON</Text>
              </View>
              <View style={[styles.wrapRow, { gap: spacing.xs }]}>
                {trainers.map((trainer) => (
                  <Chip
                    key={trainer.id}
                    label={trainer.name}
                    selected={values.acquiredWithId === trainer.id}
                    onPress={() =>
                      onChange({ acquiredWithId: values.acquiredWithId === trainer.id ? null : trainer.id })
                    }
                  />
                ))}
              </View>
            </View>
          </Section>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flexStart: { alignSelf: 'flex-start' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  bold: { fontWeight: '600' },
  stepperButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 32, textAlign: 'center' },
  chip: { borderWidth: 1 },
  chipTextSelected: { color: '#FFFFFF' },
  memoryField: { minHeight: 80, textAlignVertical: 'top' },
  attackRow: { flexDirection: 'row', alignItems: 'center' },
  removeIcon: { fontSize: 20 },
});
