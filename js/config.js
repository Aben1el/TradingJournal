const TV_SUPABASE_URL = 'https://lwdegtvvlwcrocjajzvd.supabase.co';
const TV_SUPABASE_ANON_KEY = 'sb_publishable_fVqLhHfCZcDg66ZBM-AXow_8VM9bzqr';

const tvConfigured =
  typeof TV_SUPABASE_URL === 'string' && TV_SUPABASE_URL.startsWith('https://') &&
  typeof TV_SUPABASE_ANON_KEY === 'string' && TV_SUPABASE_ANON_KEY.length > 20;

const tvClient = (tvConfigured && window.supabase)
    ? supabase.createClient(TV_SUPABASE_URL, TV_SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;
