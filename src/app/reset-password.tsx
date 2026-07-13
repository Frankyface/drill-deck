import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { supabase } from '../lib/supabase';
import { Button, Card, ErrorText, Muted, Screen, TextField, Title } from '../ui/core';
import { colors, spacing } from '../ui/theme';

/**
 * OTP-based password reset — no deep links needed on native.
 * Step 1: request a reset email. Step 2: enter the 6-digit code from the
 * email + a new password (verifyOtp type 'recovery' signs the user in,
 * then updateUser sets the password).
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestReset = async () => {
    setError(null);
    if (!email.trim()) return setError('Enter your email.');
    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setIsSubmitting(false);
    if (resetError) return setError(resetError.message);
    setStep('confirm');
  };

  const confirmReset = async () => {
    setError(null);
    if (code.trim().length < 6) return setError('Enter the 6-digit code from the email.');
    if (newPassword.length < 8) return setError('New password needs at least 8 characters.');
    setIsSubmitting(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (otpError) {
        setError(
          otpError.message.includes('expired') || otpError.message.includes('invalid')
            ? 'That code is wrong or expired — request a new one.'
            : otpError.message,
        );
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) return setError(updateError.message);
      router.replace('/'); // signed in with the new password
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen testID="reset-password-screen">
      <Title>Reset password</Title>
      {step === 'request' ? (
        <Card>
          <Muted>We&apos;ll email you a 6-digit reset code.</Muted>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="reset-email-input"
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Send reset code" onPress={requestReset} loading={isSubmitting} testID="send-reset" />
        </Card>
      ) : (
        <Card>
          <Muted>Check {email} for the code (it can take a minute).</Muted>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            testID="reset-code-input"
          />
          <TextField
            label="New password (8+ characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="new-password-input"
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Set new password" onPress={confirmReset} loading={isSubmitting} testID="confirm-reset" />
          <Button label="Resend code" variant="secondary" onPress={requestReset} disabled={isSubmitting} />
        </Card>
      )}
      <Link href="/sign-in" style={{ alignSelf: 'center', padding: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Back to sign in</Text>
      </Link>
    </Screen>
  );
}
