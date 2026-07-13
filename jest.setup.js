// Test env so importing src/lib/supabase.ts doesn't throw in unit tests.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'sb_publishable_test_key';
