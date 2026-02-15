window.HotelSys = window.HotelSys || {};
HotelSys.core = HotelSys.core || {};

function createApiClient({ baseUrl }){
  function sessionHeaders(){
    try {
      const sess = HotelSys?.core?.session?.get?.();
      if (!sess) return {};
      const u = sess.user;
      const userId = (typeof u === 'object' && u) ? u.id : sess.userId;
      const usuario = (typeof u === 'object' && u) ? u.usuario : (typeof u === 'string' ? u : null);
      const rol = sess.rol;
      const h = {};
      if (userId) h['x-hs-user-id'] = String(userId);
      if (rol) h['x-hs-role'] = String(rol);
      if (usuario) h['x-hs-user'] = String(usuario);
      return h;
    } catch { return {}; }
  }

  async function parseOrEmpty(r){
    return r.json().catch(() => ({}));
  }

  function toErr(r, data){
    const err = new Error(data.error || data.mensaje || `HTTP ${r.status}`);
    err.status = r.status;
    err.data = data;
    return err;
  }

  return {
    baseUrl,

    async get(path){
      const r = await fetch(`${baseUrl}${path}`, { headers: { ...sessionHeaders() } });
      const data = await parseOrEmpty(r);
      if(!r.ok) throw toErr(r, data);
      return data;
    },

    async post(path, body){
      const r = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify(body || {})
      });
      const data = await parseOrEmpty(r);
      if(!r.ok) throw toErr(r, data);
      return data;
    },

    async put(path, body){
      const r = await fetch(`${baseUrl}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify(body || {})
      });
      const data = await parseOrEmpty(r);
      if(!r.ok) throw toErr(r, data);
      return data;
    },

    async del(path){
      const r = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers: { ...sessionHeaders() } });
      const data = await parseOrEmpty(r);
      if(!r.ok) throw toErr(r, data);
      return data;
    }
  };
}

HotelSys.core.createApiClient = createApiClient;
