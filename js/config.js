const TV_SUPABASE_URL = 'https://lwdegtvvlwcrocjajzvd.supabase.co';
const TV_SUPABASE_ANON_KEY = 'sb_publishable_fVqLhHfCZcDg66ZBM-AXow_8VM9bzqr';

const tvConfigured =
  typeof TV_SUPABASE_URL === 'string' && TV_SUPABASE_URL.startsWith('https://') &&
  typeof TV_SUPABASE_ANON_KEY === 'string' && TV_SUPABASE_ANON_KEY.length > 20;

let tvClient = null;

function tvBootClient() {
  if (tvClient || !window.supabase || !tvConfigured) return;
  try {
    tvClient = window.supabase.createClient(TV_SUPABASE_URL, TV_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    window.dispatchEvent(new Event('tv-client-ready'));
  } catch (e) { console.warn('Supabase client error', e); }
}

tvBootClient();
window.addEventListener('tv-supabase-ready', tvBootClient);
