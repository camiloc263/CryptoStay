window.HotelSys = window.HotelSys || {};
HotelSys.core = HotelSys.core || {};

// Simple local history store (per user) for huésped actions (MVP).
HotelSys.core.historyStore = (function(){
  function key(){
    const sess = HotelSys?.core?.session?.get?.();
    const u = sess?.user;
    const userId = (typeof u === 'object' && u) ? u.id : sess?.userId;
    const usuario = (typeof u === 'object' && u) ? u.usuario : (typeof u === 'string' ? u : 'anon');
    return `hs_history_v1:${userId || usuario || 'anon'}`;
  }

  function load(){
    try {
      const raw = localStorage.getItem(key());
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function save(items){
    try { localStorage.setItem(key(), JSON.stringify(items || [])); } catch {}
  }

  function add(evt){
    const items = load();
    items.unshift({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      at: Date.now(),
      ...evt,
    });
    // keep last 100
    save(items.slice(0, 100));
  }

  function removeByRoom(roomNumber){
    const items = load();
    const next = items.filter(x => String(x.habitacion) !== String(roomNumber));
    save(next);
    return next;
  }

  // Remove huésped history entries when the room becomes available again.
  // rooms: [{numero, estado, ...}]
  function pruneAvailable(rooms){
    const map = new Map((rooms || []).map(r => [String(r.numero), String(r.estado)]));
    const items = load();
    const next = items.filter(x => {
      const estado = map.get(String(x.habitacion));
      // if we know room is available -> prune
      if (estado === 'disponible') return false;
      return true;
    });
    if (next.length !== items.length) save(next);
    return next;
  }

  function clear(){
    save([]);
  }

  return { load, add, removeByRoom, pruneAvailable, clear };
})();
