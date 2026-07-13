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
  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signUp = async () => {
    setError(null);
    setNotice(null);
    if (!displayName.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your email.');
    if (password.length < 8) return setError('Password needs at least 8 characters.');

    setIsSubmitting(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (authError) return setError(authError.message);

      if (data.session) {
        // Optional shortcut: a team code runs the normal join AFTER signup.
        if (teamCode.trim()) {
          const { error: joinError } = await supabase.rpc('join_team_by_code', {
            code: teamCode,
          });
          if (joinError) {
            setNotice(
              'Account created! That team code didn’t match though — you can join from the Teams tab.',
            );
            setTimeout(() => router.replace('/'), 1500);
            return;
          }
        }
        router.replace('/');
      } else {
        setNotice('Account created! Check your email to confirm your address, then sign in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen testID="sign-up-screen">
      <View style={{ marginTop: spacing.xl }}>
        <Title>Create your account</Title>
        <Muted>
          Build your own drill library, create or join teams, and share drills with your coaches.
        </Muted>
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
          label="Team invite code (optional)"
          value={teamCode}
          onChangeText={setTeamCode}
          autoCapitalize="characters"
          placeholder="Got a code from a coach? Enter it here"
          testID="team-code-input"
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
