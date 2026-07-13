import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import { Button, Card, ErrorText, Muted, Screen, TextField, Title } from '../ui/core';
import { colors, spacing } from '../ui/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signUp = async () => {
    setError(null);
    setNotice(null);
    if (!displayName.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your email.');
    if (password.length < 8) return setError('Password needs at least 8 characters.');
    if (!inviteCode.trim()) return setError('Enter your club invite code.');

    setIsSubmitting(true);
    try {
      // Friendly pre-check so a typo'd code fails BEFORE account creation.
      const { data: clubName, error: codeError } = await supabase.rpc('validate_invite_code', {
        code: inviteCode,
      });
      if (codeError || !clubName) {
        setError('That invite code doesn’t match any club. Double-check it with your admin.');
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            invite_code: inviteCode.trim().toUpperCase(),
          },
        },
      });
      if (authError) {
        setError(
          authError.message.includes('INVALID_INVITE_CODE')
            ? 'That invite code doesn’t match any club.'
            : authError.message,
        );
        return;
      }
      if (data.session) {
        router.replace('/'); // signed straight in (email confirmation off)
      } else {
        setNotice(
          `Account created for ${clubName}! Check your email to confirm your address, then sign in.`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen testID="sign-up-screen">
      <View style={{ marginTop: spacing.xl }}>
        <Title>Join your club</Title>
        <Muted>You need the invite code from your club admin.</Muted>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <TextField
          label="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Cam"
          testID="name-input"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
        />
        <TextField
          label="Password (8+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          testID="password-input"
        />
        <TextField
          label="Club invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          placeholder="e.g. RUCK-…"
          testID="invite-code-input"
        />
        <ErrorText>{error}</ErrorText>
        {notice ? (
          <Text style={{ color: colors.primary, marginVertical: spacing.sm }}>{notice}</Text>
        ) : null}
        <Button label="Create account" onPress={signUp} loading={isSubmitting} testID="sign-up-button" />
        <Link href="/sign-in" style={{ alignSelf: 'center', padding: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            Already have an account? Sign in
          </Text>
        </Link>
      </Card>
    </Screen>
  );
}
