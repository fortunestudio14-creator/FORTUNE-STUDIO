/* Shared owner authentication and API helpers for Fortune Studio's private admin tools. */
(function () {
  "use strict";
  const state = { client: null, session: null, ready: null };

  async function init() {
    if (state.ready) return state.ready;
    state.ready = (async () => {
      if (!window.supabase) throw new Error("The secure login service did not load. Refresh this page.");
      const cfgResponse = await fetch("/api/supabase-config", { cache: "no-store" });
      const cfg = await cfgResponse.json().catch(() => ({}));
      if (!cfgResponse.ok || !cfg.url || !cfg.key) throw new Error(cfg.error || "Could not load the secure login configuration.");
      state.client = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      const result = await state.client.auth.getSession();
      if (result.error) throw result.error;
      state.session = result.data.session;
      if (!state.session) {
        location.replace("/admin");
        throw new Error("Please sign in to the main admin page first.");
      }
      state.client.auth.onAuthStateChange((_event, session) => {
        state.session = session;
        if (!session) location.replace("/admin");
      });
      return state;
    })();
    return state.ready;
  }

  async function token() {
    await init();
    const result = await state.client.auth.getSession();
    if (result.error || !result.data.session) {
      location.replace("/admin");
      throw new Error("Your admin session expired. Sign in again.");
    }
    state.session = result.data.session;
    return state.session.access_token;
  }

  async function post(path, body) {
    const accessToken = await token();
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
      body: JSON.stringify(body || {}),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      location.replace("/admin");
      throw new Error(data.error || "Your admin session is not authorized. Sign in again.");
    }
    if (!response.ok) throw new Error(data.error || ("Request failed (" + response.status + ")."));
    return data;
  }

  async function signOut() {
    await init();
    await state.client.auth.signOut();
    location.replace("/admin");
  }

  window.FSAdmin = { init, post, signOut };
})();
