window.HotelSys = window.HotelSys || {};
HotelSys.core = HotelSys.core || {};

HotelSys.core.session = (function(){
  const KEY = 'hs_session_v1';

  const DEFAULTS = {
    ttlMs: 24 * 60 * 60 * 1000,          // 24h total
    idleTimeoutMs: 30 * 60 * 1000,       // 30 min idle
    warnBeforeMs: 2 * 60 * 1000,         // warn 2 min before idle logout
  };

  function now(){ return Date.now(); }

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function save(sess){
    try { localStorage.setItem(KEY, JSON.stringify(sess)); } catch {}
  }

  function clear(){
    try { localStorage.removeItem(KEY); } catch {}
  }

  function create({ user, rol, userId }, opts){
    const o = { ...DEFAULTS, ...(opts||{}) };
    const t = now();
    const sess = {
      user,
      userId: userId || (typeof user === 'object' && user ? user.id : undefined),
      rol,
      issuedAt: t,
      lastActive: t,
      expiresAt: t + o.ttlMs,
      idleTimeoutMs: o.idleTimeoutMs,
      warnBeforeMs: o.warnBeforeMs,
    };
    save(sess);
    return sess;
  }

  function touch(){
    const sess = load();
    if (!sess) return null;
    sess.lastActive = now();
    save(sess);
    return sess;
  }

  function isExpired(sess){
    if (!sess) return true;
    const t = now();
    if (sess.expiresAt && t > sess.expiresAt) return true;
    if (sess.idleTimeoutMs && sess.lastActive && t > (sess.lastActive + sess.idleTimeoutMs)) return true;
    return false;
  }

  function get(){
    const sess = load();
    if (!sess) return null;
    if (isExpired(sess)) { clear(); return null; }
    return sess;
  }

  function remainingIdleMs(sess){
    const t = now();
    return (sess.lastActive + sess.idleTimeoutMs) - t;
  }

  function startIdleWatcher({ onLogout, onWarn } = {}){
    let warnShown = false;

    const bump = () => { warnShown = false; touch(); };
    ['click','keydown','mousemove','scroll','touchstart'].forEach(ev => {
      window.addEventListener(ev, bump, { passive: true });
    });

    const timer = setInterval(() => {
      const sess = load();
      if (!sess) return;

      // hard expiry
      if (sess.expiresAt && now() > sess.expiresAt) {
        clear();
        onLogout && onLogout('expired');
        return;
      }

      const rem = remainingIdleMs(sess);
      if (rem <= 0) {
        clear();
        onLogout && onLogout('idle');
        return;
      }

      if (!warnShown && rem <= (sess.warnBeforeMs || DEFAULTS.warnBeforeMs)) {
        warnShown = true;
        onWarn && onWarn(Math.max(0, rem));
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      ['click','keydown','mousemove','scroll','touchstart'].forEach(ev => {
        window.removeEventListener(ev, bump);
      });
    };
  }

  return { create, get, touch, clear, startIdleWatcher };
})();
