// Este script contendrá la lógica interactiva de la página de inicio.
// Por ahora, solo simulará la búsqueda.

function safeText(v){
  return String(v ?? '').replace(/[<>&\"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','\"':'&quot;','\'':'&#39;'}[c]));
}

function photoUrl(room){
  const f = (room?.fotos && room.fotos.length) ? room.fotos[0] : '';
  if (!f) return 'https://picsum.photos/seed/hotelsys/800/500';
  if (String(f).startsWith('http')) return f;
  // normalize
  if (String(f).startsWith('/')) return f;
  return `/uploads/${f}`;
}

function fmtCop(v){
  try { return `$${Number(v||0).toLocaleString('es-CO')} COP`; } catch { return `${v} COP`; }
}

function fmtUsdFromCop(cop, rates){
  const usdCop = Number(rates?.usd_cop || 0);
  if (!usdCop) return null;
  const usd = Number(cop||0) / usdCop;
  return `$${usd.toFixed(2)} USD`;
}

function roomCard(room, rates){
  const title = safeText(room.titulo || `Habitación ${room.numero}`);
  const desc = safeText(room.descripcion || room.tipo || '');
  const cop = room.precio_cop;
  const usd = fmtUsdFromCop(cop, rates);
  const img = photoUrl(room);
  const badge = Number(room.destacado) === 1 ? `<span class="badge text-bg-light" style="border:1px solid rgba(0,0,0,.08)">Destacado</span>` : '';

  return `
    <div class="col">
      <div class="card h-100 shadow-sm offer-card" style="border-radius:16px; overflow:hidden;">
        <img src="${img}" class="card-img-top" alt="${title}" style="height:220px; object-fit:cover;">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div>
              <h5 class="card-title fw-bold mb-1">${title}</h5>
              <div class="d-flex gap-2 align-items-center">${badge}</div>
            </div>
            <span class="badge text-bg-light" style="border:1px solid rgba(0,0,0,.08)">★ ${Number(room.rating||0).toFixed(2)}</span>
          </div>
          <div class="text-muted" style="min-height:44px">${desc}</div>

          <div class="mt-3">
            <div class="fw-bold" style="font-size:1.1rem">${usd || fmtCop(cop)}</div>
            <div class="text-muted" style="font-size:.9rem">${fmtCop(cop)} / noche</div>
          </div>

          <div class="mt-auto pt-3 text-end">
            <a href="/app/" class="btn btn-sm btn-primary">Reservar</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadFeaturedRooms(){
  const featuredEl = document.getElementById('featured-rooms');
  const newEl = document.getElementById('new-rooms');
  if (!featuredEl) return;

  try {
    const [roomsRes, ratesRes] = await Promise.all([
      fetch('/api/habitaciones'),
      fetch('/api/rates')
    ]);

    if (!roomsRes.ok) throw new Error(`API habitaciones: ${roomsRes.status}`);
    const rooms = await roomsRes.json();
    const rates = ratesRes.ok ? await ratesRes.json() : null;

    // 1) Destacados
    let featured = (rooms || []).filter(r => Number(r.destacado) === 1);
    featured = featured.slice(0, 6);

    if (!featured.length) {
      featuredEl.innerHTML = `<div class="col-12"><div class="alert alert-warning">No hay destacados aún. Marca habitaciones como favorito/destacado en el panel.</div></div>`;
    } else {
      featuredEl.innerHTML = featured.map(r => roomCard(r, rates)).join('');
    }

    // 2) Nuevos (últimos 7 días)
    if (newEl) {
      const rest = (rooms || []).filter(r => Number(r.destacado) !== 1);

      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const isRecent = (r) => {
        const raw = r?.created_at;
        if (!raw) return false;
        const t = Date.parse(raw);
        if (!Number.isFinite(t)) return false;
        return (now - t) <= sevenDaysMs;
      };

      let newest = rest.filter(isRecent);

      // if there are none (or schema doesn't provide created_at), fallback to most recent by id/numero
      if (!newest.length) {
        newest = rest.slice();
        newest.sort((a,b) => {
          const ai = Number(a.id || 0);
          const bi = Number(b.id || 0);
          if (ai && bi) return bi - ai;
          return Number(b.numero||0) - Number(a.numero||0);
        });
      } else {
        newest.sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      }

      newest = newest.slice(0, 6);

      if (!newest.length) {
        newEl.innerHTML = `<div class="col-12"><div class="alert alert-warning">No hay habitaciones nuevas para mostrar.</div></div>`;
      } else {
        newEl.innerHTML = newest.map(r => roomCard(r, rates)).join('');
      }
    }

  } catch (e) {
    console.error(e);
    featuredEl.innerHTML = `<div class="col-12"><div class="alert alert-danger">No se pudieron cargar los destacados desde la base de datos.</div></div>`;
    if (newEl) newEl.innerHTML = `<div class="col-12"><div class="alert alert-danger">No se pudieron cargar los nuevos desde la base de datos.</div></div>`;
  }
}

function openRegister(){
  if (typeof Swal === 'undefined') {
    return alert('Registro no disponible (SweetAlert2 no cargó).');
  }

  Swal.fire({
    title: 'Crear cuenta',
    html: `
      <div class="hs-swal-form" style="text-align:left">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="font-weight:900;display:block;margin:0 0 6px">Nombre</label>
            <input id="rg-nombre" class="swal2-input" placeholder="Ej: Carlos" autocomplete="given-name" style="margin:0; width:100%">
          </div>
          <div>
            <label style="font-weight:900;display:block;margin:0 0 6px">Apellido</label>
            <input id="rg-apellido" class="swal2-input" placeholder="Ej: Zapata" autocomplete="family-name" style="margin:0; width:100%">
          </div>
        </div>

        <label style="font-weight:900;display:block;margin:0 0 6px">Correo electrónico</label>
        <input id="rg-email" class="swal2-input" placeholder="Ej: carlos@mail.com" autocomplete="email" style="margin:0 0 12px; width:100%">

        <label style="font-weight:900;display:block;margin:0 0 6px">Usuario</label>
        <input id="rg-user" class="swal2-input" placeholder="Ej: carlos" autocomplete="username" style="margin:0 0 12px; width:100%">

        <label style="font-weight:900;display:block;margin:0 0 6px">Contraseña</label>
        <input id="rg-pass" type="password" class="swal2-input" placeholder="Mínimo 4 caracteres" autocomplete="new-password" style="margin:0; width:100%">

        <div style="margin-top:10px;color:#64748b;font-size:13px">
          Se creará una cuenta tipo <b>Huésped</b>.
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Crear cuenta',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusConfirm: false,
    preConfirm: async () => {
      const nombre = document.getElementById('rg-nombre')?.value?.trim();
      const apellido = document.getElementById('rg-apellido')?.value?.trim();
      const email = document.getElementById('rg-email')?.value?.trim();
      const usuario = document.getElementById('rg-user')?.value?.trim();
      const password = document.getElementById('rg-pass')?.value?.trim();

      if (!nombre || nombre.length < 2) {
        Swal.showValidationMessage('Ingresa un nombre válido');
        return;
      }
      if (!apellido || apellido.length < 2) {
        Swal.showValidationMessage('Ingresa un apellido válido');
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim());
      if (!emailOk) {
        Swal.showValidationMessage('Ingresa un correo electrónico válido');
        return;
      }
      if (!usuario || usuario.length < 3) {
        Swal.showValidationMessage('El usuario debe tener al menos 3 caracteres');
        return;
      }
      if (!password || password.length < 4) {
        Swal.showValidationMessage('La contraseña debe tener al menos 4 caracteres');
        return;
      }

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, apellido, email, usuario, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.error || data?.mensaje || 'No se pudo registrar';
          throw Object.assign(new Error(msg), { status: res.status });
        }
        return data;
      } catch (e) {
        Swal.showValidationMessage(e.message || 'No se pudo registrar');
        return;
      }
    }
  }).then((r) => {
    if (!r.isConfirmed) return;
    Swal.fire({
      icon: 'success',
      title: '¡Cuenta creada!',
      text: 'Ya puedes iniciar sesión en el panel.',
      confirmButtonText: 'Ir al panel'
    }).then(() => {
      window.location.href = '/app/admin.html';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedRooms();
});

function performSearch() {
    const destination = document.getElementById('destination').value;
    const checkIn = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;

    if (destination || checkIn || checkOut) {
        // Simulación de búsqueda con SweetAlert2 si está disponible, o alert normal
        if (typeof Swal !== 'undefined') {
             Swal.fire({
                title: 'Buscando disponibilidad...',
                text: `Destino: ${destination || 'Cualquier destino'}\nFechas: ${checkIn} - ${checkOut}`,
                timer: 1400,
                timerProgressBar: true,
                didOpen: () => { Swal.showLoading() }
            }).then(() => {
                 Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    text: 'Abriendo el panel de reservas...',
                    confirmButtonText: 'Continuar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/app/';
                    }
                });
            });
        } else {
            window.location.href = '/app/';
        }

    } else {
        alert('Por favor, ingresa al menos un criterio de búsqueda.');
    }
}