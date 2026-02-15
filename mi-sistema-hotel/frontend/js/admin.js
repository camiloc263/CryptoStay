const API_URL = 'http://localhost:3000/api';
let habitaciones = [];
let usuarioActual = null;

// UI state
let __filterEstado = 'all';
let __search = '';

// Huésped: reservas reales desde Web2 (MySQL) via /api/me/reservas
let __myReservasIds = [];

function actualizarStats() {
    const total = habitaciones.length;
    const disp = habitaciones.filter(h => h.estado === 'disponible').length;
    const occ = habitaciones.filter(h => h.estado === 'ocupada').length;
    const lim = habitaciones.filter(h => h.estado === 'limpieza').length;

    const el = document.getElementById('room-stats');
    if (el) el.textContent = `Total ${total} • Disponible ${disp} • Ocupada ${occ} • Limpieza ${lim}`;
}

function bindUIControls() {
    const search = document.getElementById('room-search');
    if (search) {
        search.addEventListener('input', (e) => {
            __search = (e.target.value || '').trim();
            renderizarHabitaciones();
        });
    }

    document.querySelectorAll('.chip[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            // permisos por rol: huésped solo puede ver "all" y "disponible"
            const sessRol = usuarioActual?.rol;
            if (sessRol === 'huesped') {
              const f = btn.getAttribute('data-filter') || 'all';
              if (f === 'ocupada' || f === 'limpieza') return;
            }

            document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            __filterEstado = btn.getAttribute('data-filter') || 'all';
            renderizarHabitaciones();
        });
    });

    // Link sidebar "Mis Reservas" -> activar filtro
    const btnHist = document.getElementById('btn-historial');
    if (btnHist) {
      btnHist.addEventListener('click', (e) => {
        e.preventDefault();
        const chip = document.getElementById('chip-mis-reservas');
        if (chip) chip.click();
      });
    }
}

// --- LÓGICA DE LOGIN ---
// Restore persisted session (24h) so user doesn't have to log in again
function tryRestoreSession(){
  try {
    const sess = HotelSys?.core?.session?.get?.();
    if (sess?.user && sess?.rol) {
      const usuario = (typeof sess.user === 'object' && sess.user) ? sess.user.usuario : sess.user;
      const id = (typeof sess.user === 'object' && sess.user) ? sess.user.id : sess.userId;
      // mimic login payload
      usuarioActual = { id, usuario, rol: sess.rol };
      aplicarPermisos({ id, usuario, rol: sess.rol });
    }
  } catch (e) { console.error('Restore session failed', e); }
}

// Init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    tryRestoreSession();
});

async function iniciarSesion() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, password: pass })
        });
        const data = await res.json();

        if (res.ok) {
            usuarioActual = data;
            // persist session (24h) + idle logout (30m)
            try {
              HotelSys.core.session.create({ user: { id: data.id, usuario: data.usuario }, rol: data.rol });
            } catch {}
            aplicarPermisos(data);
        } else {
            Swal.fire('Error', data.mensaje, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'No se pudo conectar. ¿Está encendido el servidor?', 'error');
    }
}

async function refreshMisReservasFromDb() {
  if (usuarioActual?.rol !== 'huesped') return;
  try {
    const rows = await HotelSys.core?.clients?.api?.get?.('/me/reservas?only=active');
    __myReservasIds = (rows || []).map(x => String(x.habitacion_numero));

    // show/hide chip
    const chip = document.getElementById('chip-mis-reservas');
    if (chip) {
      if (__myReservasIds.length) chip.classList.remove('d-none');
      else chip.classList.add('d-none');
    }

    // If user was on "mis-reservas" but now has none, reset filter to avoid empty screen.
    if (!__myReservasIds.length && __filterEstado === 'mis-reservas') {
      __filterEstado = 'all';
      try {
        document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
        const all = document.querySelector('.chip[data-filter="all"]');
        if (all) all.classList.add('active');
      } catch {}
    }
  } catch {
    __myReservasIds = [];
    // hide chip
    try {
      const chip = document.getElementById('chip-mis-reservas');
      if (chip) chip.classList.add('d-none');
    } catch {}

    // if we were filtering mis-reservas, reset to all
    if (__filterEstado === 'mis-reservas') {
      __filterEstado = 'all';
      try {
        document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
        const all = document.querySelector('.chip[data-filter="all"]');
        if (all) all.classList.add('active');
      } catch {}
    }
  }
}

function aplicarPermisos(data) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-interface').style.display = 'block';

    // start idle watcher
    try {
      HotelSys.core.session.startIdleWatcher({
        onWarn: (ms) => {
          const sec = Math.ceil(ms/1000);
          Swal.fire({
            title: '¿Sigues ahí?',
            text: `Tu sesión se cerrará por inactividad en ${sec}s.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Seguir conectado',
            cancelButtonText: 'Cerrar sesión',
            focusConfirm: false,
            customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
          }).then(r => {
            if (r.isConfirmed) HotelSys.core.session.touch();
            else cerrarSesion(true);
          });
        },
        onLogout: () => cerrarSesion(true)
      });
    } catch {}


    document.getElementById('user-display').innerText = data.usuario.toUpperCase();
    document.getElementById('role-display').innerText = data.rol.toUpperCase();

    // Airbnb-like profile menu
    try { initProfileMenu(); } catch {}

    const btnGestion = document.getElementById('btn-gestionar');
    const btnReserva = document.getElementById('btn-nueva-reserva');

    btnGestion.style.display = 'none';
    btnReserva.style.display = 'none';

    if (data.rol === 'administrador' || data.rol === 'gerente') {
        btnGestion.style.display = 'inline-block';
        btnReserva.style.display = 'inline-block';
    } else if (data.rol === 'huesped') {
        btnReserva.style.display = 'inline-block';

        // show history entry for huésped
        try {
          const bh = document.getElementById('btn-historial');
          if (bh) bh.classList.remove('d-none');
          const ch = document.getElementById('chip-mis-reservas');
          if (ch) ch.classList.remove('d-none');
        } catch {}

        // Init Chatbot (Web3 assistant)
        try { HotelSys.ui.chatbotWidget.init(); } catch {}
    }

    // Touch session so it doesn't immediately idle-timeout
    try { HotelSys.core.session.touch(); } catch {}

    // Bind UI controls once UI is visible 
    bindUIControls();
    // Load guest reservations from DB (MySQL)
    try { refreshMisReservasFromDb(); } catch {}
    obtenerHabitaciones(); 
} 

function cerrarSesion(clear = true) {
    try {
      if (clear && window.HotelSys?.core?.session) {
        HotelSys.core.session.clear();
      }
    } catch {}
    location.reload(); // Reset
}

// --- Profile menu (Airbnb-like) ---
function initProfileMenu(){
  const btn = document.getElementById('hs-profile-btn');
  const menu = document.getElementById('hs-profile-menu');
  if (!btn || !menu) return;

  // Fill user info
  const name = usuarioActual?.usuario || 'Usuario';
  const rol = usuarioActual?.rol || '';
  const avatar = document.getElementById('hs-avatar');
  const nm = document.getElementById('hs-profile-name');
  const rl = document.getElementById('hs-profile-role');
  if (avatar) avatar.textContent = String(name).trim().charAt(0).toUpperCase() || 'U';
  if (nm) nm.textContent = name;
  if (rl) rl.textContent = rol;

  // Items
  const miManage = document.getElementById('hs-menu-manage');
  const miHistory = document.getElementById('hs-menu-history');
  const miGuestPanel = document.getElementById('hs-menu-guest-panel');
  const miLinkWallet = document.getElementById('hs-menu-link-wallet');
  const miLogout = document.getElementById('hs-menu-logout');
  const walletLine = document.getElementById('hs-profile-wallet');

  const canManage = (rol === 'administrador' || rol === 'gerente');
  if (miManage) miManage.style.display = canManage ? 'flex' : 'none';

  const canHistory = (rol === 'huesped');
  if (miHistory) miHistory.style.display = canHistory ? 'flex' : 'none';

  // Wallet status (huésped)
  if (walletLine) walletLine.style.display = 'none';

  // Link wallet is mainly useful for huésped (will be hidden if already linked)
  if (miLinkWallet) miLinkWallet.style.display = (rol === 'huesped') ? 'flex' : 'none';

  if (rol === 'huesped') {
    try {
      HotelSys.core?.clients?.api?.get?.('/me').then((me) => {
        const primary = (me?.wallets || []).find(w => Number(w.is_primary) === 1) || (me?.wallets || [])[0];
        const addr = primary?.wallet;
        if (addr) {
          if (walletLine) {
            walletLine.style.display = 'flex';
            walletLine.innerHTML = `<span class="dot"></span><span>Wallet vinculada</span> <code>${addr.slice(0, 8)}…${addr.slice(-6)}</code>`;
          }
          if (miLinkWallet) miLinkWallet.style.display = 'none';
        }
      }).catch(()=>{});
    } catch {}
  }

  // Toggle
  const closeMenu = () => { menu.style.display = 'none'; };
  const openMenu = () => { menu.style.display = 'block'; };
  const isOpen = () => menu.style.display !== 'none';

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) closeMenu(); else openMenu();
  };

  document.addEventListener('click', () => closeMenu(), { capture: true });
  menu.addEventListener('click', (e) => e.stopPropagation());

  if (miManage) miManage.onclick = () => { closeMenu(); abrirPanelGestion(); };
  if (miHistory) miHistory.onclick = () => {
    closeMenu();
    const chip = document.getElementById('chip-mis-reservas');
    if (chip) chip.click();
  };
  if (miGuestPanel) miGuestPanel.onclick = () => {
    closeMenu();
    window.location.href = '/app/cliente.html';
  };
  if (miLinkWallet) miLinkWallet.onclick = async () => {
    closeMenu();
    try {
      await HotelSys.web3.ensureHardhatNetwork();
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new window.ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      const out = await HotelSys.core?.clients?.api?.post?.('/wallets/link', { wallet: addr });
      await Swal.fire({
        icon: 'success',
        title: 'Wallet vinculada',
        text: `Se vinculó ${addr.slice(0, 8)}…${addr.slice(-6)} a tu usuario.`,
        customClass: { popup: 'hs-swal-popup', confirmButton: 'hs-swal-confirm' },
        buttonsStyling: false,
      });

      // refresh guest reservas after linking
      try { await refreshMisReservasFromDb(); } catch {}
      try { renderizarHabitaciones(); } catch {}
      return out;
    } catch (e) {
      console.error(e);
      if (HotelSys.web3?.isUserRejected?.(e)) {
        return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask.', 'info');
      }
      return Swal.fire('Error', e?.message || 'No se pudo vincular wallet', 'error');
    }
  };

  if (miLogout) miLogout.onclick = () => { closeMenu(); cerrarSesion(true); };
}

// Favoritos (DB): toggle destacado
async function toggleFav(roomNumber) {
    try {
        const room = habitaciones.find(h => String(h.numero) === String(roomNumber));
        const next = room ? !(Number(room.destacado) === 1) : true;

        const r = await fetch(`${API_URL}/habitaciones/${roomNumber}/destacado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destacado: next })
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo actualizar favorito');

        // actualiza local
        if (room) room.destacado = next ? 1 : 0;

        const icon = document.getElementById(`fav-${roomNumber}`);
        if (icon) icon.className = next ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

    } catch (e) {
        console.error(e);
        Swal.fire('Error', e.message || 'No se pudo actualizar favorito', 'error');
    }
}

function applyFavs() {
    habitaciones.forEach(r => {
        const icon = document.getElementById(`fav-${r.numero}`);
        if (icon) icon.className = (Number(r.destacado) === 1) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    });
}

// --- CARGA DE HABITACIONES ---
async function obtenerHabitaciones() {
    try {
        // Cargar tasas y habitaciones en paralelo
        const [resRooms, resRates] = await Promise.all([
            fetch(`${API_URL}/habitaciones`),
            fetch(`${API_URL}/rates`)
        ]);

        if (!resRooms.ok) throw new Error(`Error servidor: ${resRooms.status}`);

        habitaciones = await resRooms.json();
        window._rates = resRates.ok ? await resRates.json() : null; // Guardar tasas globalmente

        // Huésped: cargar "Mis Reservas" reales desde DB
        try {
          if (usuarioActual?.rol === 'huesped') {
            await refreshMisReservasFromDb();
          }
        } catch {}

        renderizarHabitaciones();
    } catch (error) {
        console.error(error);
        const el = document.getElementById('room-stats');
        if (el) el.innerHTML = `<span style="color:#ff6b6b;font-weight:bold">Falló: ${error.message}</span>`;
        const c = document.getElementById('rooms-container');
        if (c) c.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error de carga: ${error.message}. Por favor recarga la página.</div></div>`;
    }
}

function renderizarHabitaciones() {
  try {
    const container = document.getElementById('rooms-container');
    if (!container) return;

    let html = '';
    let contadorVisible = 0;

    try { actualizarStats(); } catch (e) { console.error('Error stats:', e); }

    const rol = usuarioActual?.rol;

    // Normalize filter (defensive): avoid getting stuck in an unknown filter value
    let __filter = 'all';
    try {
      const f = String(__filterEstado || 'all').trim().toLowerCase();
      const allowed = ['all','disponible','ocupada','limpieza','mis-reservas'];
      __filter = allowed.includes(f) ? f : 'all';
      __filterEstado = __filter;
    } catch {
      __filter = 'all';
      __filterEstado = 'all';
    }

    // Role UX: restrict huésped chips
    if (rol === 'huesped') {
      try {
        const c1 = document.getElementById('chip-ocupada');
        const c2 = document.getElementById('chip-limpieza');
        if (c1) c1.classList.add('d-none');
        if (c2) c2.classList.add('d-none');
        // if user had an old filter selected, reset
        if (__filterEstado === 'ocupada' || __filterEstado === 'limpieza') __filterEstado = 'all';
      } catch {}
    }

    // Para admin/gerente: por defecto ver TODO. Para otros roles mantenemos reglas previas.
    const isAdminLike = (rol === 'administrador' || rol === 'gerente');

    // Search term: read from input to avoid stale/hidden characters in __search
    let term = '';
    try {
      const raw = (document.getElementById('room-search')?.value ?? __search ?? '');
      term = String(raw)
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
        .toLowerCase();
      __search = term;
    } catch {
      term = String(__search || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
      __search = term;
    }

    // Huésped: Mis Reservas desde DB (MySQL) por user_id
    const misReservasIds = (rol === 'huesped') ? (__myReservasIds || []) : [];

    habitaciones.forEach(r => {
        let mostrar = true;

        // Huésped: regla sólida y simple para evitar pantallas vacías por estados/caches raros
        // - En "Todas" y "Disponibles" solo mostramos disponibles
        // - En "Mis Reservas" mostramos solo las suyas y solo si siguen ocupadas
        if (rol === 'huesped') {
            if (__filter === 'mis-reservas') {
                mostrar = (misReservasIds.includes(String(r.numero)) && r.estado === 'ocupada');
            } else {
                // all / disponible / cualquier otro -> disponibles
                mostrar = (r.estado === 'disponible');
            }
        } else {
            // Restricciones por rol (no huésped)
            if (!isAdminLike) {
                if (rol === 'aseo' && r.estado !== 'limpieza') mostrar = false;
            }

            // Filtro por estado (chips)
            if (mostrar && __filter !== 'all') {
                if (r.estado !== __filter) mostrar = false;
            }
        }

        // Búsqueda por número/tipo
        if (mostrar && term) {
            const hay = `${r.numero} ${r.tipo} ${r.estado}`.toLowerCase();
            if (!hay.includes(term)) mostrar = false;
        }

        if (mostrar) {
            contadorVisible++;
            let color = r.estado === 'disponible' ? 'status-disponible' : (r.estado === 'ocupada' ? 'status-ocupada' : 'status-limpieza');
            let badge = r.estado === 'disponible' ? 'var(--green)' : (r.estado === 'ocupada' ? 'var(--red)' : 'var(--yellow)');

            const img = (r.fotos && r.fotos.length) ? r.fotos[0] : '';
            const bgStyle = img ? `style="background-image:url('${img}')"` : '';

            // Datos 100% reales de la DB
            const priceCOP = Number(r.precio_cop || 0);

            // Cálculos de moneda
            let priceDisplay = `<span class="price">$${priceCOP.toLocaleString('es-CO')} COP</span>`;

            if (window._rates && window._rates.usd_cop && priceCOP > 0) {
                const usd = priceCOP / window._rates.usd_cop;
                const eth = usd / (window._rates.eth_usd || 2500);

                priceDisplay = `
                    <div class="price-multi">
                        <span class="price-usd">$${usd.toFixed(2)} USD</span>
                        <span class="price-crypto">
                            <span class="price-cop">$${priceCOP.toLocaleString('es-CO')}</span>
                            <span class="sep">•</span>
                            <span class="price-eth">Ξ${eth.toFixed(4)}</span>
                        </span>
                    </div>
                `;
            } else {
                 priceDisplay = `<span class="price">$${priceCOP.toLocaleString('es-CO')} COP</span>`;
            }

            const title = r.titulo || `Habitación ${r.numero}`;
            const subtitle = r.descripcion || r.tipo || 'Sin descripción';

            // Puntos de navegación para galería (si hay fotos)
            const dots = (r.fotos && r.fotos.length) ? r.fotos.slice(0, 5).map((_,i)=>`<span class=\"dot ${i===0?'active':''}\"></span>`).join('') : '';

            // Rating solo si existe en DB
            const ratingHtml = (r.rating)
                ? `<span class="rating">★ ${r.rating} ${r.reviews ? `(${r.reviews})` : ''}</span>`
                : '';

            html += `
              <div class="col-md-3">
                <div class="listing-card" data-room="${r.numero}">
                  <div class="listing-photo" ${bgStyle} onclick="gestionarClick('${r.numero}', '${r.estado}')">
                    ${(Number(r.destacado)===1) ? `<div class="listing-chip"><span class="trophy">🏆</span> Favorito</div>` : ''}
                    <button class="heart-btn" type="button" onclick="event.stopPropagation(); toggleFav('${r.numero}')" aria-label="Favorito">
                      <i class="fa-regular fa-heart" id="fav-${r.numero}"></i>
                    </button>
                    <div class="listing-status" style="background:${badge}">${r.estado.toUpperCase()}</div>
                    <div class="listing-dots">${dots}</div>
                    <div class="photo-overlay"></div>
                  </div>

                  <div class="listing-body">
                    <div class="listing-title">${title} ${ratingHtml}</div>
                    <div class="listing-sub">${subtitle}</div>
                    <div class="listing-price">${priceDisplay} <span class="per">/noche</span></div>
                  </div>
                </div>
              </div>
            `;
        }
    });

    if (contadorVisible === 0) {
        html = `<div class="col-12">
                  <div class="p-4 rounded-3" style="border:1px solid var(--border); background: rgba(255,255,255,0.04)">
                    <div class="fw-bold">Sin resultados</div>
                    <div class="text-muted small">Prueba cambiar el filtro o limpiar la búsqueda.</div>
                  </div>
                </div>`;
    }

    container.innerHTML = html;
    applyFavs();
  } catch (err) {
    console.error('Error renderizando:', err);
    const c = document.getElementById('rooms-container');
    if (c) c.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error mostrando habitaciones: ${err.message}</div></div>`;
  }
}

// --- WEB3 helpers (pago desde panel) ---
let __web3ConfigCache = null;

async function getWeb3Config() {
    if (__web3ConfigCache) return __web3ConfigCache;
    const r = await fetch(`${API_URL}/web3/config`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'No se pudo cargar config Web3');
    __web3ConfigCache = data;
    return data;
}

async function ensureHardhatNetwork() {
    if (!window.ethereum) throw new Error('MetaMask no está disponible');
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
        });
    } catch (e) {
        if (e.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x7a69',
                    chainName: 'Hardhat Local',
                    rpcUrls: ['http://127.0.0.1:8545'],
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                }],
            });
        } else {
            throw e;
        }
    }
}

async function pagarReservaWeb3(reservaId, montoEth) {
    await ensureHardhatNetwork();
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const { hotelAddress, hotelABI } = await getWeb3Config();

    // ethers UMD expone window.ethers
    const provider = new window.ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new window.ethers.Contract(hotelAddress, hotelABI, signer);

    const value = window.ethers.parseEther(String(montoEth || '0'));
    const tx = await contract.pagarReserva(reservaId, { value });
    const receipt = await tx.wait();
    return receipt.hash;
}

async function obtenerReservaPendientePorHabitacion(numero) {
    try {
        const r = await fetch(`${API_URL}/reservas/pendiente/${numero}`);
        if (r.status === 404) return null;
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Error API');
        return data;
    } catch (e) {
        console.warn('No se pudo obtener reserva:', e);
        return null;
    }
}

// --- GESTIÓN DE CLICS ---
async function gestionarClick(numero, estado) {
    const rol = usuarioActual.rol;
    if (rol === 'aseo') {
        Swal.fire({
          title: '¿Marcar como limpia?',
          text: 'Esto cambiará el estado de la habitación a disponible.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, marcar',
          cancelButtonText: 'Cancelar',
          reverseButtons: true,
          buttonsStyling: false,
          customClass: {
            popup: 'hs-swal-popup',
            confirmButton: 'hs-swal-confirm',
            cancelButton: 'hs-swal-cancel'
          }
        }).then(r => { if (r.isConfirmed) cambioEstado('/limpiar', numero); });
    } else if (estado === 'disponible') {
        const room = habitaciones.find(h => String(h.numero) === String(numero));
        const title = room?.titulo || `Habitación ${numero}`;
        const subtitle = room?.descripcion || (room?.tipo || '');
        const rating = room?.rating ? `★ ${room.rating} (${room.reviews || 0})` : '';
        const price = room?.precio_cop ? `$${Number(room.precio_cop).toLocaleString('es-CO')} COP` : '';

        const photo = (room?.fotos && room.fotos.length) ? room.fotos[0] : '';

        const fotos = (room?.fotos && room.fotos.length) ? room.fotos : [];
        const dots = fotos.slice(0, 6).map((_, i) => `<span class="hs-dot ${i===0?'active':''}" data-idx="${i}"></span>`).join('');

        const html = `
          <div class="hs-modal-pro">
            <div class="hs-hero">
              <div class="hs-hero-media" id="hs-hero-media" style="${photo ? `background-image:url('${photo}')` : ''}"></div>
              <div class="hs-hero-overlay"></div>

              <div class="hs-hero-top">
                <div class="hs-chip">${(room?.destacado==1) ? '🏆 Favorito entre huéspedes' : 'Disponible'}</div>
                <button class="hs-iconbtn" id="hs-btn-cancel" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
              </div>

              ${fotos.length > 1 ? `
              <button class="hs-nav hs-nav-left" id="hs-prev" type="button" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
              <button class="hs-nav hs-nav-right" id="hs-next" type="button" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
              <div class="hs-dots" id="hs-dots">${dots}</div>
              ` : ''}

              <div class="hs-hero-bottom">
                <div class="hs-title">${title}</div>
                <div class="hs-sub">${subtitle}</div>
              </div>
            </div>

            <div class="hs-content">
              <div class="hs-kpis">
                <div class="hs-kpi"><div class="hs-kpi-label">Rating</div><div class="hs-kpi-value">${rating || '-'}</div></div>
                <div class="hs-kpi"><div class="hs-kpi-label">Precio</div><div class="hs-kpi-value">${price ? `${price} <span class='hs-kpi-muted'>/noche</span>` : '-'}</div></div>
              </div>

              <div class="hs-info">
                <div class="hs-info-item"><i class="fa-solid fa-calendar-days"></i> Selecciona fechas disponibles abajo</div>
                <div class="hs-info-item"><i class="fa-solid fa-shield-heart"></i> Cancelación gratuita</div>
              </div>

              <div class="hs-date">
                <label class="hs-date-label">Fechas (check-in → check-out)</label>
                <input id="hs-dates" class="hs-date-input" placeholder="Selecciona un rango" />
                <div id="hs-date-error" class="hs-error" style="display:none"></div>
              </div>

              <div class="hs-actions-row">
                <button id="hs-btn-photos" class="hs-btn2 hs-btn2-secondary" type="button">
                  <i class="fa-regular fa-images"></i>
                  <span>Ver galería</span>
                </button>
                <button id="hs-btn-reserve" class="hs-btn2 hs-btn2-primary" type="button">
                  <i class="fa-solid fa-calendar-check"></i>
                  <span>Reservar</span>
                </button>
              </div>
            </div>
          </div>
        `;

        await Swal.fire({
          title: '',
          html,
          showConfirmButton: false,
          showCancelButton: false,
          background: 'rgba(36,50,71,0.98)',
          color: '#f8fafc',
          customClass: {
            popup: 'hs-swal-popup'
          },
          didOpen: () => {
            // calendar in modal
            if (window.flatpickr) {
              window.flatpickr(document.getElementById('hs-dates'), {
                mode: 'range',
                dateFormat: 'Y-m-d',
                minDate: 'today',
                onChange: () => {
                  const err = document.getElementById('hs-date-error');
                  const input = document.getElementById('hs-dates');
                  if (err) { err.style.display = 'none'; err.textContent = ''; }
                  if (input) input.classList.remove('hs-input-error');
                }
              });
            }

            // carousel
            let idx = 0;
            const hero = document.getElementById('hs-hero-media');
            const setIdx = (n) => {
              if (!fotos.length) return;
              idx = (n + fotos.length) % fotos.length;
              if (hero) hero.style.backgroundImage = `url('${fotos[idx]}')`;
              document.querySelectorAll('#hs-dots .hs-dot').forEach(d => {
                d.classList.toggle('active', Number(d.getAttribute('data-idx')) === idx);
              });
            };
            document.getElementById('hs-prev')?.addEventListener('click', (e) => { e.stopPropagation(); setIdx(idx-1); });
            document.getElementById('hs-next')?.addEventListener('click', (e) => { e.stopPropagation(); setIdx(idx+1); });
            document.querySelectorAll('#hs-dots .hs-dot').forEach(d => {
              d.addEventListener('click', (e) => { e.stopPropagation(); setIdx(Number(d.getAttribute('data-idx'))); });
            });

            document.getElementById('hs-btn-photos')?.addEventListener('click', () => {
              Swal.close();
              mostrarGaleria(numero);
            });

            document.getElementById('hs-btn-reserve')?.addEventListener('click', () => {
              const dates = (document.getElementById('hs-dates')?.value || '').trim();
              const parts = dates.split(' to ');
              const check_in = parts[0] || '';
              const check_out = parts[1] || '';

              const err = document.getElementById('hs-date-error');
              const input = document.getElementById('hs-dates');

              if (!check_in || !check_out) {
                if (err) {
                  err.textContent = 'Selecciona un rango completo (check-in y check-out) para continuar.';
                  err.style.display = 'block';
                }
                if (input) {
                  input.classList.add('hs-input-error');
                  input.focus();
                }
                return;
              }

              if (err) { err.style.display = 'none'; err.textContent = ''; }
              if (input) input.classList.remove('hs-input-error');

              Swal.close();
              abrirReservaPrefill(numero, dates);
            });

            document.getElementById('hs-btn-cancel')?.addEventListener('click', () => Swal.close());
          }
        });

    } else if (estado === 'ocupada') {
        let canManage = (rol === 'administrador' || rol === 'gerente');

        // Huésped puede gestionar sus propias reservas
        if (!canManage && rol === 'huesped') {
             try {
                const misIds = (__myReservasIds || []);
                if (misIds.includes(String(numero))) canManage = true;
             } catch {}
        }

        if (canManage) {
            // SOLID: Liberar + pagos Web3 movido a módulo dedicado
            await HotelSys.ui.releaseModal.open({
              numero,
              cambioEstado,
              obtenerReservaPendientePorHabitacion,
              onRefresh: obtenerHabitaciones
            });
            return;
        }

        // Legacy (deprecated): Ventana de liberar con pago Web3 (ETH / mUSDC) + acciones Web2
        let reserva = null;
        try {
            reserva = await obtenerReservaPendientePorHabitacion(numero);
        } catch (e) {
            // Puede estar ocupada sin reserva pendiente registrada
            reserva = null;
        }

        const montoDemo = (reserva && reserva.monto_eth) ? String(reserva.monto_eth) : '0.01';

        // Cargamos config Web3 para mostrar direcciones y permitir pagar
        let web3cfg = null;
        try { web3cfg = await getWeb3Config(); } catch (e) { web3cfg = null; }

        const rid = reserva ? String(reserva.id) : '(sin reserva pendiente)';

        // rates for USD/crypto (demo, from backend)
        let rates = null;
        try {
          const rr = await fetch(`${API_URL}/rates`);
          rates = await rr.json();
        } catch { rates = null; }

        // try to compute real total from room price (COP) * nights
        let totalCOP = null;
        let usdTotal = null;
        let ethTotal = null;
        let usdcTotal = null;

        try {
          const roomsR = await fetch(`${API_URL}/habitaciones`);
          const rooms = await roomsR.json();
          const room = (rooms || []).find(x => String(x.numero) === String(numero));
          const noches = Number(reserva?.noches || 0);
          const precioCOP = Number(room?.precio_cop || 0);

          if (noches > 0 && precioCOP > 0 && rates?.usd_cop && rates?.eth_usd) {
            totalCOP = precioCOP * noches;
            usdTotal = totalCOP / Number(rates.usd_cop);
            ethTotal = usdTotal / Number(rates.eth_usd);
            usdcTotal = usdTotal; // 1 mUSDC ~= 1 USD (demo)
          }
        } catch {}

        const fmtUSD = (n) => {
          try { return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n); }
          catch { return `$${Number(n||0).toFixed(2)} USD`; }
        };
        const fmtCOP = (n) => {
          try { return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n); }
          catch { return `$${Number(n||0).toLocaleString('es-CO')} COP`; }
        };

        const usdText = (usdTotal != null && Number.isFinite(usdTotal)) ? fmtUSD(usdTotal) : null;
        const copText = (totalCOP != null && Number.isFinite(totalCOP)) ? fmtCOP(totalCOP) : null;
        const ethText = (ethTotal != null && Number.isFinite(ethTotal)) ? `${ethTotal.toFixed(6)} ETH` : null;
        const usdcText = (usdcTotal != null && Number.isFinite(usdcTotal)) ? `${usdcTotal.toFixed(2)} mUSDC` : null;

        const shortHotel = web3cfg?.hotelAddress ? `${web3cfg.hotelAddress.slice(0, 8)}…${web3cfg.hotelAddress.slice(-6)}` : null;

        const html = `
          <div class="hs-release">
            <div class="hs-release-head">
              <div class="hs-release-title">Liberar habitación</div>
              <div class="hs-release-sub">Elige una opción para <b>finalizar la salida</b> y dejar la habitación disponible.</div>
            </div>

            <div class="hs-release-grid">
              <div class="hs-kv">
                <div class="hs-k">Habitación</div>
                <div class="hs-v">${numero}</div>
              </div>
              <div class="hs-kv">
                <div class="hs-k">Reserva #</div>
                <div class="hs-v">${rid}</div>
              </div>
              <div class="hs-kv hs-kv-wide">
                <div class="hs-k">Valor a cobrar</div>
                <div class="hs-v">
                  ${usdText ? `<div class="hs-amt">${usdText}</div>` : `<div class="hs-amt">${montoDemo}</div>`}
                  ${(ethText || usdcText) ? `<div class="hs-crypto">${ethText ? `<b>${ethText}</b>` : ''}${(ethText && usdcText) ? ' • ' : ''}${usdcText ? `<b>${usdcText}</b>` : ''}</div>` : `<div class="hs-muted">(demo • mismo valor para ETH o mUSDC)</div>`}
                </div>
              </div>
              ${shortHotel ? `
              <div class="hs-kv hs-kv-wide">
                <div class="hs-k">Contrato (solo info)</div>
                <div class="hs-v"><code class="hs-code">${shortHotel}</code></div>
              </div>
              ` : ''}
            </div>

            <div class="hs-release-tip">
              <div class="hs-tip-title">Recomendado</div>
              <div class="hs-tip-text">Si el huésped va a pagar ahora, usa <b>ETH</b> o <b>mUSDC</b>. Si ya pagó por otro medio, usa <b>Liberar sin pago</b>.</div>
            </div>

            <div class="hs-release-actions">
              <button id="btn-go-pay" class="hs-act hs-act-primary" type="button">
                <i class="fa-solid fa-credit-card"></i>
                <div class="hs-act-text">
                  <div class="hs-act-title">Pagar</div>
                  <div class="hs-act-sub">Ir a opciones de pago (USD + cripto)</div>
                </div>
              </button>

              <button id="btn-liberar" class="hs-act hs-act-info" type="button">
                <i class="fa-solid fa-unlock"></i>
                <div class="hs-act-text">
                  <div class="hs-act-title">Liberar sin pago</div>
                  <div class="hs-act-sub">Marca salida sin registrar pago</div>
                </div>
              </button>

              <button id="btn-cancelar" class="hs-act hs-act-danger" type="button">
                <i class="fa-solid fa-ban"></i>
                <div class="hs-act-text">
                  <div class="hs-act-title">Cancelar reserva</div>
                  <div class="hs-act-sub">Solo si fue un error / no llegó</div>
                </div>
              </button>

              <div class="hs-release-dev">
                <div class="hs-dev-title">Herramientas de desarrollo</div>
                <div class="hs-dev-actions">
                  <button id="btn-faucet" class="hs-act hs-act-ghost" type="button">
                    <i class="fa-solid fa-faucet-drip"></i>
                    <span>Faucet mUSDC</span>
                  </button>
                  <button id="btn-sbt" class="hs-act hs-act-ghost" type="button">
                    <i class="fa-solid fa-id-badge"></i>
                    <span>Activar membresía</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        await Swal.fire({
            title: '',
            html,
            showConfirmButton: false,
            showCancelButton: false,
            showDenyButton: false,
            showCloseButton: true,
            focusConfirm: false,
            customClass: {
              popup: 'hs-swal-popup hs-swal-release'
            },
            didOpen: () => {
                const byId = (id) => document.getElementById(id);

                const safeClose = () => { try { Swal.close(); } catch {} };

                const ensureReserva = async () => {
                    if (reserva) return reserva;
                    // reintenta por si se creó justo ahora
                    reserva = await obtenerReservaPendientePorHabitacion(numero);
                    return reserva;
                };

                byId('btn-go-pay')?.addEventListener('click', async () => {
                    // Go to payment page (guest-style)
                    try {
                      const rsv = await ensureReserva();
                      window.location.href = `/app/pago.html?reservaId=${encodeURIComponent(rsv.id)}&habitacion=${encodeURIComponent(numero)}`;
                    } catch (e) {
                      Swal.fire('Info', 'No hay reserva pendiente para pagar.', 'info');
                    }
                });

                byId('btn-liberar')?.addEventListener('click', async () => {
                    safeClose();
                    await cambioEstado('/liberar', numero);
                });

                byId('btn-cancelar')?.addEventListener('click', async () => {
                    safeClose();
                    try {
                        const rsv = await ensureReserva();
                        await fetch(`${API_URL}/reservas/cancelar`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reservaId: rsv.id })
                        });
                        Swal.fire('Listo', `Reserva #${rsv.id} cancelada`, 'success');
                    } catch (e) {
                        Swal.fire('Info', 'No hay reserva pendiente para cancelar.', 'info');
                    }
                });

                byId('btn-faucet')?.addEventListener('click', async () => {
                    try {
                        await ensureHardhatNetwork();
                        await window.ethereum.request({ method: 'eth_requestAccounts' });
                        const cfg = await getWeb3Config();
                        const provider = new window.ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const usdc = new window.ethers.Contract(cfg.usdcAddress, cfg.usdcABI, signer);
                        const me = await signer.getAddress();
                        const tx = await usdc.faucet(me, window.ethers.parseUnits('100', 6));
                        await tx.wait();
                        Swal.fire('OK', 'Faucet: recibiste 100 mUSDC', 'success');
                    } catch (e) {
                        console.error(e);
                        Swal.fire('Error', e.message || 'No se pudo usar faucet', 'error');
                    }
                });

                byId('btn-sbt')?.addEventListener('click', async () => {
                    try {
                        await ensureHardhatNetwork();
                        await window.ethereum.request({ method: 'eth_requestAccounts' });
                        const cfg = await getWeb3Config();
                        const provider = new window.ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const sbt = new window.ethers.Contract(cfg.sbtAddress, cfg.sbtABI, signer);
                        const me = await signer.getAddress();
                        const tx = await sbt.mint(me);
                        await tx.wait();
                        Swal.fire('OK', 'Membresía activada (SBT)', 'success');
                    } catch (e) {
                        console.error(e);
                        Swal.fire('Error', e.message || 'No se pudo activar membresía', 'error');
                    }
                });

                byId('btn-pay-eth')?.addEventListener('click', async () => {
                    safeClose();
                    try {
                        const rsv = await ensureReserva();
                        const txHash = await pagarReservaWeb3(String(rsv.id), String(monto));
                        await fetch(`${API_URL}/reservas/confirmar-pago`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reservaId: rsv.id, txHash })
                        });
                        await cambioEstado('/liberar', numero);
                        Swal.fire('OK', 'Pago ETH registrado y habitación liberada.', 'success');
                    } catch (e) {
                        console.error(e);
                        if (e?.code === 4001 || e?.info?.error?.code === 4001) {
                          return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask. No se realizó ningún cobro.', 'info');
                        }
                        Swal.fire('Error', e.message || 'No se pudo pagar/liberar', 'error');
                    }
                });

                byId('btn-pay-usdc')?.addEventListener('click', async () => {
                    safeClose();
                    try {
                        const rsv = await ensureReserva();
                        await ensureHardhatNetwork();
                        await window.ethereum.request({ method: 'eth_requestAccounts' });

                        const cfg = await getWeb3Config();
                        const provider = new window.ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();

                        const usdc = new window.ethers.Contract(cfg.usdcAddress, cfg.usdcABI, signer);
                        const hotel = new window.ethers.Contract(cfg.hotelAddress, cfg.hotelABI, signer);

                        const amount = window.ethers.parseUnits(String(monto || '0'), 6);
                        const tx1 = await usdc.approve(cfg.hotelAddress, amount);
                        await tx1.wait();

                        const tx2 = await hotel.pagarReservaUSDC(String(rsv.id), amount);
                        const receipt = await tx2.wait();

                        await fetch(`${API_URL}/reservas/confirmar-pago`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reservaId: rsv.id, txHash: receipt.hash })
                        });

                        await cambioEstado('/liberar', numero);
                        Swal.fire('OK', 'Pago mUSDC registrado y habitación liberada.', 'success');
                    } catch (e) {
                        console.error(e);
                        if (e?.code === 4001 || e?.info?.error?.code === 4001) {
                          return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask. No se realizó ningún cobro.', 'info');
                        }
                        Swal.fire('Error', e.message || 'No se pudo pagar con mUSDC', 'error');
                    }
                });
            }
        });

    } else if (estado === 'limpieza' && (rol === 'administrador' || rol === 'gerente')) {
        Swal.fire({
          title: '¿Marcar como limpia?',
          text: 'Esto cambiará el estado de la habitación a disponible.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, marcar',
          cancelButtonText: 'Cancelar',
          reverseButtons: true,
          buttonsStyling: false,
          customClass: {
            popup: 'hs-swal-popup',
            confirmButton: 'hs-swal-confirm',
            cancelButton: 'hs-swal-cancel'
          }
        }).then(r => { if (r.isConfirmed) cambioEstado('/limpiar', numero); });
    }
}

async function cambioEstado(endpoint, numero) {
    await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({habitacion: numero})});
    obtenerHabitaciones();
}

// --- FUNCIONES EXTRA (Resumidas) ---
function mostrarGaleria(numero) {
    const h = habitaciones.find(r => String(r.numero) === String(numero));
    const fotos = (h?.fotos || []).slice(0, 12);
    if (!fotos.length) return Swal.fire('Info', 'Esta habitación no tiene fotos.', 'info');

    const thumbs = fotos.map((url, i) => `
      <button class="hs-thumb ${i===0?'active':''}" data-idx="${i}" type="button" aria-label="Foto ${i+1}">
        <img src="${url}" alt="Foto ${i+1}" />
      </button>
    `).join('');

    const html = `
      <div class="hs-gallery hs-gallery-full">
        <div class="hs-gallery-top">
          <div>
            <div class="hs-gallery-title">Galería • Habitación ${numero}</div>
            <div class="hs-gallery-sub">${h?.titulo || (h?.tipo || '')}</div>
          </div>
          <div class="hs-gallery-right">
            <div class="hs-gallery-count" id="hs-g-count">1/${fotos.length}</div>
            <button class="hs-iconbtn" id="hs-g-close" type="button" aria-label="Cerrar">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div class="hs-gallery-stage hs-gallery-stage-full">
          <div class="hs-gallery-stage-media hs-gallery-stage-media-full" id="hs-g-stage" style="background-image:url('${fotos[0]}')"></div>
          <button class="hs-nav hs-nav-left" id="hs-g-prev" type="button" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="hs-nav hs-nav-right" id="hs-g-next" type="button" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <div class="hs-gallery-thumbs" id="hs-g-thumbs">${thumbs}</div>
      </div>
    `;

    let idx = 0;
    const setIdx = (n) => {
        idx = (n + fotos.length) % fotos.length;
        const stage = document.getElementById('hs-g-stage');
        if (stage) stage.style.backgroundImage = `url('${fotos[idx]}')`;
        document.querySelectorAll('#hs-g-thumbs .hs-thumb').forEach(t => {
            t.classList.toggle('active', Number(t.getAttribute('data-idx')) === idx);
        });
        const count = document.getElementById('hs-g-count');
        if (count) count.textContent = `${idx+1}/${fotos.length}`;
    };

    Swal.fire({
        title: '',
        html,
        showConfirmButton: false,
        background: 'transparent',
        backdrop: 'rgba(15, 23, 42, 0.92)',
        customClass: { popup: 'hs-swal-gallery' },
        width: '100vw',
        padding: 0,
        didOpen: () => {
            const close = () => Swal.close();
            document.getElementById('hs-g-close')?.addEventListener('click', close);
            document.getElementById('hs-g-prev')?.addEventListener('click', (e) => { e.stopPropagation(); setIdx(idx-1); });
            document.getElementById('hs-g-next')?.addEventListener('click', (e) => { e.stopPropagation(); setIdx(idx+1); });
            document.querySelectorAll('#hs-g-thumbs .hs-thumb').forEach(t => {
                t.addEventListener('click', (e) => { e.stopPropagation(); setIdx(Number(t.getAttribute('data-idx'))); });
            });

            // Swipe (touch)
            const stageEl = document.getElementById('hs-g-stage');
            let startX = null;
            let startY = null;
            const onTouchStart = (e) => {
              const t = e.touches && e.touches[0];
              if (!t) return;
              startX = t.clientX;
              startY = t.clientY;
            };
            const onTouchEnd = (e) => {
              if (startX === null) return;
              const t = e.changedTouches && e.changedTouches[0];
              if (!t) return;
              const dx = t.clientX - startX;
              const dy = t.clientY - startY;
              startX = null;
              startY = null;
              // ignore vertical scroll gestures
              if (Math.abs(dy) > Math.abs(dx)) return;
              if (dx > 40) setIdx(idx - 1);
              else if (dx < -40) setIdx(idx + 1);
            };
            stageEl?.addEventListener('touchstart', onTouchStart, { passive: true });
            stageEl?.addEventListener('touchend', onTouchEnd, { passive: true });

            // Keyboard support
            const onKey = (e) => {
                if (e.key === 'Escape') return close();
                if (e.key === 'ArrowLeft') return setIdx(idx-1);
                if (e.key === 'ArrowRight') return setIdx(idx+1);
            };
            document.addEventListener('keydown', onKey);

            // Clean up when modal closes
            const obs = new MutationObserver(() => {
              const popup = document.querySelector('.swal2-popup');
              if (!popup) {
                document.removeEventListener('keydown', onKey);
                stageEl?.removeEventListener('touchstart', onTouchStart);
                stageEl?.removeEventListener('touchend', onTouchEnd);
                obs.disconnect();
              }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        }
    });
}

// Alias: el botón dice abrirFormularioReserva() en el HTML
function abrirFormularioReserva() {
    return abrirReserva();
}

function abrirHistorial(){
  try { return HotelSys.ui.huespedHistoryModal.open(); } catch {}
}

async function abrirReservaPrefill(roomNumero, datesPrefill) {
    const ok = await HotelSys.ui.reservaModal.openPrefill({
      roomNumero,
      datesPrefill,
      habitaciones
    });
    if (ok) obtenerHabitaciones();
}

async function abrirReserva() {
    const ok = await HotelSys.ui.reservaModal.open({ habitaciones });
    if (ok) obtenerHabitaciones();
}

async function abrirPanelGestion() {
    const rows = habitaciones
      .slice()
      .sort((a,b) => String(a.numero).localeCompare(String(b.numero)))
      .map(h => {
          const img = (h.fotos && h.fotos.length) ? h.fotos[0] : '';
          const bgStyle = img ? `style="background-image:url('${img}')"` : '';
          return `
            <div class="hs-manage-item">
              <div class="hs-m-img" ${bgStyle}></div>
              <div class="hs-m-info">
                <div class="hs-m-num">Habitación ${h.numero}</div>
                <div class="hs-m-sub">${h.tipo} • $${Number(h.precio_cop||0).toLocaleString('es-CO')}</div>
              </div>
              <div class="hs-m-actions">
                <button onclick="editarHabitacion('${h.id}')" class="hs-icon-btn hs-manage-edit" title="Editar">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="eliminarHabitacion('${h.id}')" class="hs-icon-btn hs-manage-del" title="Eliminar">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `;
      }).join('');

    const html = `
      <div class="hs-manage">
        <div class="hs-manage-head">
          <div class="hs-manage-title">
            <i class="fa-solid fa-layer-group"></i> Gestionar Habitaciones
          </div>
          <button onclick="crearHabitacion()" class="hs-manage-add">
            <i class="fa-solid fa-plus"></i> Agregar
          </button>
        </div>
        <div class="hs-manage-list">
          ${rows || '<div class="hs-manage-empty">No hay habitaciones registradas.</div>'}
        </div>
      </div>
    `;

    Swal.fire({
      title: '',
      html,
      width: 600,
      showConfirmButton: false,
      showCloseButton: true,
      focusConfirm: false,
      padding: 0,
      customClass: { popup: 'hs-swal-popup hs-swal-manage' }
    });
}

async function crearHabitacion() {
    const ok = await HotelSys.ui.habitacionManageModal.crearHabitacion();
    if (ok) { await obtenerHabitaciones(); abrirPanelGestion(); }
}

async function editarHabitacion(id) {
    const ok = await HotelSys.ui.habitacionManageModal.editarHabitacion({ habitaciones, id });
    if (ok) { await obtenerHabitaciones(); abrirPanelGestion(); }
}

async function eliminarHabitacion(id) {
    const ok = await HotelSys.ui.habitacionManageModal.eliminarHabitacion({ id });
    if (ok) { await obtenerHabitaciones(); abrirPanelGestion(); }
}

// Music player removed