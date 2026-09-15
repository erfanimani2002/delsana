// ============================================================
// Supabase client — single shared instance for the whole app.
// Requires the Supabase JS CDN script to be loaded before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// ============================================================
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

  if (!window.supabase) {
    console.error('Supabase SDK not loaded. Check the <script> tag order in your HTML.');
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
})();
