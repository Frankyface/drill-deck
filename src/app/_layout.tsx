import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CACHE_MAX_AGE_MS, cachePersister, queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { LoadingState } from '../ui/core';

function AuthGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthScreens = segments[0] === 'sign-in' || segments[0] === 'sign-up';

  useEffect(() => {
    if (isLoading) return;
    if (!session && !inAuthScreens) {
      router.replace('/sign-in');
    } else if (session && inAuthScreens) {
      router.replace('/');
    }
  }, [session, isLoading, inAuthScreens, router]);

  // Never render protected screens while signed out (and vice versa) — a
  // brief anon mount would cache empty query results as fresh data.
  if (isLoading) return <LoadingState />;
  if (!session && !inAuthScreens) return <LoadingState />;
  if (session && inAuthScreens) return <LoadingState />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: cachePersister, maxAge: CACHE_MAX_AGE_MS }}
      >
        <AuthProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="sign-up" options={{ headerShown: false }} />
              <Stack.Screen name="drill/new" options={{ title: 'New drill' }} />
              <Stack.Screen name="drill/[id]/index" options={{ title: 'Drill' }} />
              <Stack.Screen name="drill/[id]/edit" options={{ title: 'Edit drill' }} />
              <Stack.Screen name="drill/[id]/diagram" options={{ title: 'Diagram' }} />
              <Stack.Screen name="session/new" options={{ title: 'New session' }} />
              <Stack.Screen name="session/[id]/index" options={{ title: 'Session' }} />
              <Stack.Screen name="session/[id]/edit" options={{ title: 'Build session' }} />
              <Stack.Screen name="session/[id]/review" options={{ title: 'Review session' }} />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
