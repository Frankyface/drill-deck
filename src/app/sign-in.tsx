import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { Button, Card, ErrorText, Muted, Screen, TextField, Title } from '../ui/core';
import { colors, spacing } from '../ui/theme';

/** Anon-readable connectivity probe — proves app ↔ Supabase before sign-in. */
function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_check')
        .select('note, updated_at')
        .eq('id', 1)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const health = useHealthCheck();

  const signIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);
    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Wrong email or password.'
          : authError.message,
      );
    }
    // success: AuthGate redirects automatically
  };

  return (
    <Screen testID="sign-in-screen">
      <View style={{ marginTop: spacing.xxl }}>
        <Title>🏉 Drill Deck</Title>
        <Muted>Your club&apos;s shared drill library.</Muted>
      </View>

      <Card style={{ marginTop: spacing.xl }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          testID="email-input"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          testID="password-input"
        />
        <ErrorText>{error}</ErrorText>
        <Button label="Sign in" onPress={signIn} loading={isSubmitting} testID="sign-in-button" />
        <Link href="/sign-up" style={{ alignSelf: 'center', padding: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            New coach? Create an account
          </Text>
        </Link>
        <Link href="/reset-password" style={{ alignSelf: 'center', padding: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Forgot password?</Text>
        </Link>
      </Card>

      <View style={{ alignItems: 'center', marginTop: spacing.lg }} testID="health-status">
        {health.isLoading ? (
          <Muted>Checking connection…</Muted>
        ) : health.isError ? (
          <Muted>⚠ Can&apos;t reach the server — check your signal and pull to retry.</Muted>
        ) : (
          <Muted>✓ Connected — {health.data?.note}</Muted>
        )}
      </View>
    </Screen>
  );
}
