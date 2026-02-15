window.HotelSys = window.HotelSys || {};

(async function(){
  const clients = HotelSys.core?.clients;
  const prefsStore = HotelSys.ai?.prefsStore;
  const recommender = HotelSys.ai?.recommender;
  const prefsQuiz = HotelSys.ai?.prefsQuiz;

  const $ = (sel) => document.querySelector(sel);
  const fmtCOP = (n) => {
    try { return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(Number(n||0)); }
    catch { return `${n} COP`; }
  };

  function cardHtml(room){
    const img = (room.fotos && room.fotos[0]) ? room.fotos[0] : '';
    const reasons = (room.reasons || []).map(r => `<span class="hs-ai-reason">${r}</span>`).join('');
    return `
      <div class="hs-ai-room" data-room="${room.numero}">
        <div class="hs-ai-room-img" style="background-image:url('${img||''}')"></div>
        <div class="hs-ai-room-body">
          <div class="hs-ai-room-top">
            <div>
              <div class="hs-ai-room-title">Habitación ${room.numero} • ${room.tipo || ''}</div>
              <div class="hs-ai-room-price">${fmtCOP(room.precio_cop)} / noche</div>
            </div>
            ${room.destacado ? '<div class="hs-ai-badge">Destacada</div>' : ''}
          </div>
          <div class="hs-ai-room-desc">${room.descripcion || ''}</div>
          <div class="hs-ai-reasons">${reasons}</div>
          <div class="hs-ai-room-actions">
            <button class="hs-ai-btn2" type="button" data-view="${room.numero}">Ver detalles</button>
            <button class="hs-ai-btn2" type="button" data-pay="${room.numero}">Reservar y pagar</button>
          </div>
        </div>
      </div>
    `;
  }

  async function loadRooms(){
    return clients.habitaciones.list();
  }

  async function loadPrefs(){
    // start with local
    let prefs = prefsStore.loadPrefs();

    // if session exists, try to fetch server prefs (best-effort)
    try {
      const sess = HotelSys.core?.session?.get?.();
      if (sess) {
        const mine = await clients.api.get('/me/preferences');
        if (mine) prefs = { ...prefs, ...mine };
      }
    } catch {}

    return prefs;
  }

  async function savePrefs(p){
    prefsStore.savePrefs(p);

    // if logged-in, persist
    try {
      const sess = HotelSys.core?.session?.get?.();
      if (sess) await clients.api.post('/me/preferences', p);
    } catch {}

    await refresh();
  }

  async function refresh(){
    const prefs = await loadPrefs();
    prefsQuiz.render({ mountId: 'hs-prefs', prefs, onSave: savePrefs });

    const rooms = await loadRooms();
    const events = prefsStore.loadEvents();

    // logged-in: prefer server recommendations (includes reasons)
    let recs = null;
    try {
      const sess = HotelSys.core?.session?.get?.();
      if (sess) {
        const out = await clients.api.get('/recommendations?limit=6');
        recs = out?.items || null;
      }
    } catch {}

    if (!recs) {
      recs = recommender.recommend({ rooms, prefs, events, limit: 6 });
    }

    const mount = document.getElementById('hs-recs');
    if (mount) {
      mount.innerHTML = (recs || []).map(cardHtml).join('') || '<div class="hs-ai-empty">No recommendations yet.</div>';
    }

    async function trackView(numero){
      if (!numero) return;
      // local event
      prefsStore.pushEvent({ event_type: 'room_view', room_numero: numero, meta: {} });
      // server event (best-effort)
      try {
        const sess = HotelSys.core?.session?.get?.();
        if (sess) await clients.api.post('/events', { event_type: 'room_view', room_numero: numero, meta: {} });
      } catch {}
    }

    async function crearReservaYIrAPago(numero){
      const n = String(numero);
      // 1) try existing pending
      try {
        const rv = await clients.reservas.getPendienteByHabitacion(n);
        if (rv?.id) return window.location.href = `/app/pago.html?reservaId=${encodeURIComponent(rv.id)}`;
      } catch {}

      // 2) create pending (guest or logged-in)
      // For demo, we create the reservation first; the payment page will show the exact amount.
      const out = await clients.api.post('/reservas/pending', { habitacion_numero: n, wallet: null, monto_eth: null });
      const rid = out?.reservaId;
      if (!rid) throw new Error('No se pudo crear la reserva');
      window.location.href = `/app/pago.html?reservaId=${encodeURIComponent(rid)}`;
    }

    function openDetails(room){
      const img = (room.fotos && room.fotos[0]) ? room.fotos[0] : '';
      const reasons = (room.reasons || []).map(r => `<span class="hs-ai-reason">${r}</span>`).join('');
      const html = `
        <div style="text-align:left">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="width:160px;height:110px;border-radius:14px;background:#e5e7eb;background-size:cover;background-position:center;flex:0 0 auto" style="background-image:url('${img}')"></div>
            <div>
              <div style="font-weight:950;font-size:16px">Habitación ${room.numero} • ${room.tipo||''}</div>
              <div style="margin-top:4px;color:var(--text-muted);font-weight:800">${fmtCOP(room.precio_cop)} / noche</div>
              <div style="margin-top:10px;color:var(--text-muted);font-weight:700">${room.descripcion||''}</div>
            </div>
          </div>
          <div class="hs-ai-reasons" style="margin-top:12px">${reasons}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
            <button class="hs-ai-btn2" id="hs-detail-pay" type="button">Reservar y pagar</button>
          </div>
        </div>
      `;
      // simple modal
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="hs-ai-modal-backdrop" id="hs-ai-modal">
          <div class="hs-ai-modal">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="font-weight:950">Detalles</div>
              <button class="hs-ai-btn2" id="hs-detail-close" type="button">Cerrar</button>
            </div>
            <div style="margin-top:10px">${html}</div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap);
      const modal = document.getElementById('hs-ai-modal');
      const close = () => { try { modal?.remove(); } catch {} };
      document.getElementById('hs-detail-close')?.addEventListener('click', close);
      modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });
      document.getElementById('hs-detail-pay')?.addEventListener('click', async () => {
        try { await crearReservaYIrAPago(room.numero); } catch (e) { alert(e?.message || 'Error'); }
      });
    }

    // attach handlers
    document.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const numero = btn.getAttribute('data-view');
        const room = (recs || []).find(r => String(r.numero) === String(numero));
        await trackView(numero);
        if (room) openDetails(room);
        await refresh();
      });
    });

    document.querySelectorAll('button[data-pay]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const numero = btn.getAttribute('data-pay');
        try {
          await trackView(numero);
          await crearReservaYIrAPago(numero);
        } catch (e) {
          alert(e?.message || 'No se pudo iniciar el pago');
        }
      });
    });
  }

  // boot
  try {
    await prefsStore.trySync({ clients });
  } catch {}

  await refresh();
})();
