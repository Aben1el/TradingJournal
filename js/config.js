const TV_SUPABASE_URL = 'https://lwdegtvvlwcrocjajzvd.supabase.co';
const TV_SUPABASE_ANON_KEY = 'sb_publishable_fVqLhHfCZcDg66ZBM-AXow_8VM9bzqr';

const tvConfigured =
  typeof TV_SUPABASE_URL === 'string' && TV_SUPABASE_URL.startsWith('https://') &&
  typeof TV_SUPABASE_ANON_KEY === 'string' && TV_SUPABASE_ANON_KEY.length > 20;

let tvClient = null;
window.tvClient = null;

// ---- THEME: apply saved theme instantly (no flash) ----
(function () {
    const t = localStorage.getItem('tv_theme') || 'dark';
    document.documentElement.dataset.theme = t;
    const s = document.createElement('script');
    s.src = 'js/theme.js';
    document.body.appendChild(s);
})();

function tvBootClient() {
  if (tvClient || !window.supabase || !tvConfigured) return;
  try {
    tvClient = window.supabase.createClient(TV_SUPABASE_URL, TV_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    window.tvClient = tvClient;
    window.dispatchEvent(new Event('tv-client-ready'));
  } catch (e) { console.warn('Supabase client error', e); }
}

(async () => {
  if (!tvConfigured) return;
  const sources = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    'https://esm.sh/@supabase/supabase-js@2',
    'https://cdn.skypack.dev/@supabase/supabase-js@2'
  ];
  for (const url of sources) {
    try {
      const m = await import(url);
      if (m && m.createClient) { window.supabase = { createClient: m.createClient }; break; }
    } catch (e) { console.warn('CDN failed:', url); }
  }
  tvBootClient();
  window.dispatchEvent(new Event('tv-supabase-ready'));
})();

window.addEventListener('tv-supabase-ready', tvBootClient);
