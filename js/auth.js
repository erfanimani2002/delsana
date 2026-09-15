// ============================================================
// Auth helpers — used only by the admin panel.
// ============================================================
window.Auth = (function () {
  async function login(email, password) {
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    await window.sb.auth.signOut();
    window.location.hash = '#/login';
    window.location.reload();
  }

  async function getSession() {
    const { data } = await window.sb.auth.getSession();
    return data.session;
  }

  // Redirects to #/login if no session; resolves with the session otherwise.
  // Call this at the top of admin/app.js before rendering any route.
  async function requireSession() {
    const session = await getSession();
    if (!session) {
      window.location.replace('index.html#/login');
      return null;
    }
    return session;
  }

  return { login, logout, getSession, requireSession };
})();
