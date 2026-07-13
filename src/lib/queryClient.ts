import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, Platform } from 'react-native';

const DAY_MS = 24 * 60 * 60 * 1000;

// gcTime must be >= the persister maxAge or hydration silently drops entries.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: DAY_MS,
      retry: 1,
    },
  },
});

// Recently-viewed data survives restarts — the pitch-side read cache.
export const cachePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'drill-deck-query-cache',
});

export const CACHE_MAX_AGE_MS = DAY_MS;

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}
