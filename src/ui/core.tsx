import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, MIN_TOUCH, radius, spacing } from './theme';

export function Screen({
  children,
  scroll = true,
  padded = true,
  testID,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? spacing.lg : 0;
  if (!scroll) {
    return (
      <View
        testID={testID}
        style={[styles.screen, { paddingTop: insets.top + pad, paddingHorizontal: pad }]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      testID={testID}
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + pad,
        paddingHorizontal: pad,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Card({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const isBlocked = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={isBlocked}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && {
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
        },
        variant === 'secondary' && [
          styles.buttonSecondary,
          pressed && { backgroundColor: colors.chipBg },
        ],
        variant === 'danger' && { backgroundColor: colors.danger },
        isBlocked && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.onPrimary} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'secondary' && { color: colors.primary },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, error ? styles.inputError : null]}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.chipSelectedBg }]}
    >
      <Text style={[styles.chipLabel, selected && { color: colors.chipSelectedText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty} testID="empty-state">
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  muted: { fontSize: font.sm, color: colors.textMuted },
  error: { color: colors.danger, fontSize: font.sm, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  button: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginVertical: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonLabel: { color: colors.onPrimary, fontSize: font.md, fontWeight: '700' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
    color: colors.text,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.sm },
  inputError: { borderColor: colors.danger },
  chip: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipLabel: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
});
