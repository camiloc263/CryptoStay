window.HotelSys = window.HotelSys || {};
HotelSys.ai = HotelSys.ai || {};

HotelSys.ai.prefsStore = (function(){
  const PREFS_KEY = 'hs_prefs_v1';
  const EVENTS_KEY = 'hs_events_v1';
  const SYNC_KEY = 'hs_events_synced_v1';

  function safeJsonParse(s){
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  }

  function loadPrefs(){
    return safeJsonParse(localStorage.getItem(PREFS_KEY)) || {
      trip_type: null,
      budget: null,
      preferred_room_type: null,
      amenities: [],
    };
  }

  function savePrefs(p){
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p || {})); } catch {}
  }

  function loadEvents(){
    return safeJsonParse(localStorage.getItem(EVENTS_KEY)) || [];
  }

  function saveEvents(arr){
    try { localStorage.setItem(EVENTS_KEY, JSON.stringify(arr || [])); } catch {}
  }

  function pushEvent(ev){
    const arr = loadEvents();
    const next = [{
      event_type: String(ev?.event_type || ''),
      room_numero: ev?.room_numero ? String(ev.room_numero) : null,
      meta: ev?.meta || null,
      created_at: ev?.created_at || new Date().toISOString(),
    }, ...arr].slice(0, 100);
    saveEvents(next);
    return next;
  }

  async function trySync({ clients }){
    const sess = HotelSys.core?.session?.get?.();
    if (!sess || !clients?.api) return { skipped: true };

    // avoid syncing repeatedly in same session
    try {
      const last = Number(localStorage.getItem(SYNC_KEY) || 0);
      if (Date.now() - last < 60 * 1000) return { skipped: true };
    } catch {}

    const prefs = loadPrefs();
    const events = loadEvents();
    if (!prefs && (!events || !events.length)) return { skipped: true };

    try {
      await clients.api.post('/me/preferences/merge', { prefs, events });
      localStorage.setItem(SYNC_KEY, String(Date.now()));
      // keep local prefs (guest continuity), but we can clear events (optional)
      // saveEvents([]);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  return { loadPrefs, savePrefs, loadEvents, pushEvent, trySync };
})();
