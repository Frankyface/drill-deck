import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, ChipRow } from './core';
import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (next: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <ChipRow>
      {options.map((opt) => (
        <Chip
          key={opt}
          testID={`chip-${opt}`}
          label={labels?.[opt] ?? opt}
          selected={value === opt}
          onPress={() => onChange(opt)}
        />
      ))}
    </ChipRow>
  );
}

export function ChipMultiSelect({
  options,
  selectedIds,
  onToggle,
}: {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <ChipRow>
      {options.map((opt) => (
        <Chip
          key={opt.id}
          testID={`chip-${opt.name}`}
          label={opt.name}
          selected={selectedIds.includes(opt.id)}
          onPress={() => onToggle(opt.id)}
        />
      ))}
    </ChipRow>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  testID,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  testID?: string;
}) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));
  return (
    <View style={styles.stepperWrap} testID={testID}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`decrease ${label}`}
          onPress={decrease}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue} testID={testID ? `${testID}-value` : undefined}>
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`increase ${label}`}
          onPress={increase}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StarRating({
  value,
  onChange,
  size = 32,
  testID,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
  testID?: string;
}) {
  return (
    <View style={styles.starRow} testID={testID}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={!onChange}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
          onPress={() => onChange?.(star)}
          hitSlop={6}
          testID={testID ? `${testID}-star-${star}` : undefined}
        >
          <Text
            style={{
              fontSize: size,
              lineHeight: size + 4,
              color: star <= value ? colors.star : colors.border,
            }}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  stepperLabel: { fontSize: font.md, fontWeight: '600', color: colors.text },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  stepperButtonText: { fontSize: font.lg, fontWeight: '700', color: colors.primary },
  stepperValue: {
    fontSize: font.lg,
    fontWeight: '700',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  starRow: { flexDirection: 'row', gap: spacing.xs },
});
