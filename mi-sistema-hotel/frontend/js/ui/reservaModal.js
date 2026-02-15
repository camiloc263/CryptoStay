window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.reservaModal = (function(){
  const clients = HotelSys.core?.clients;

  const parseRange = (dates) => {
    const parts = String(dates || '').trim().split(' to ');
    return { check_in: parts[0] || null, check_out: parts[1] || null };
  };

  async function openPrefill({ roomNumero, datesPrefill, habitaciones }){
    const disp = (habitaciones || []).filter(h => h.estado === 'disponible');
    const room = disp.find(h => String(h.numero) === String(roomNumero)) || disp[0];
    const valueRoom = room ? room.numero : roomNumero;

    const { value: v } = await Swal.fire({
      title: 'Reservar',
      html: `
        <div class="hs-form">
          <label class="hs-field">
            <span>Nombre del huésped</span>
            <input id="sw-n" class="swal2-input hs-input" placeholder="Ej: Carlos Zambrano" autocomplete="off">
          </label>

          <label class="hs-field">
            <span>Habitación</span>
            <input class="swal2-input hs-input" value="${valueRoom}" disabled>
          </label>

          <label class="hs-field">
            <span>Fechas (check-in → check-out)</span>
            <input id="sw-dates" class="swal2-input hs-input" placeholder="Selecciona un rango">
          </label>

          <div class="hs-help">Selecciona un rango de fechas. El sistema calcula noches automáticamente.</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear reserva',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: {
        popup: 'hs-swal-popup hs-swal-form',
        confirmButton: 'hs-swal-confirm',
        cancelButton: 'hs-swal-cancel'
      },
      didOpen: () => {
        if (window.flatpickr) {
          window.flatpickr(document.getElementById('sw-dates'), {
            mode: 'range',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            defaultDate: datesPrefill || null,
          });
        }
        if (datesPrefill) {
          const el = document.getElementById('sw-dates');
          if (el) el.value = datesPrefill;
        }
      },
      preConfirm: () => {
        const nombre = (document.getElementById('sw-n').value || '').trim();
        const dates = (document.getElementById('sw-dates').value || '').trim();
        const { check_in, check_out } = parseRange(dates);

        if (!nombre) {
          Swal.showValidationMessage('Por favor ingresa el nombre del huésped.');
          return false;
        }
        if (!check_in || !check_out) {
          Swal.showValidationMessage('Por favor selecciona un rango de fechas (check-in y check-out).');
          return false;
        }

        return { nombre, habitacion: valueRoom, check_in, check_out };
      }
    });

    if (v) {
      // huésped: attach primary linked wallet (so "Mis reservas" can be resolved)
      const rol = HotelSys?.core?.session?.get?.()?.rol;
      if (rol === 'huesped') {
        try {
          const me = await clients.api.get('/me');
          const primary = (me.wallets || []).find(w => Number(w.is_primary) === 1) || (me.wallets || [])[0];
          if (primary?.wallet) v.wallet = primary.wallet;
        } catch {}
      }

      await clients.api.post('/reservas', v);
      // add to history
      try {
        if (HotelSys.core?.historyStore?.add) {
          HotelSys.core.historyStore.add({
            type: 'reserva',
            title: 'Reserva creada',
            habitacion: v.habitacion,
            check_in: v.check_in,
            check_out: v.check_out,
            notes: `Huésped: ${v.nombre}`
          });
        }
      } catch {}
      return true;
    }
    return false;
  }

  async function open({ habitaciones }){
    const disp = (habitaciones || []).filter(h => h.estado === 'disponible');
    const opts = disp.map(h => `<option value="${h.numero}">${h.numero}</option>`).join('');

    const { value: v } = await Swal.fire({
      title: 'Reservar',
      html: `
        <div class="hs-form">
          <label class="hs-field">
            <span>Nombre del huésped</span>
            <input id="sw-n" class="swal2-input hs-input" placeholder="Ej: Carlos Zambrano" autocomplete="off">
          </label>

          <label class="hs-field">
            <span>Habitación</span>
            <select id="sw-h" class="swal2-select hs-select">${opts}</select>
          </label>

          <label class="hs-field">
            <span>Fechas (check-in → check-out)</span>
            <input id="sw-dates" class="swal2-input hs-input" placeholder="Selecciona un rango">
          </label>

          <div class="hs-help">Selecciona un rango de fechas. El sistema calcula noches automáticamente.</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear reserva',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: {
        popup: 'hs-swal-popup hs-swal-form',
        confirmButton: 'hs-swal-confirm',
        cancelButton: 'hs-swal-cancel'
      },
      didOpen: () => {
        if (window.flatpickr) {
          window.flatpickr(document.getElementById('sw-dates'), {
            mode: 'range',
            dateFormat: 'Y-m-d',
            minDate: 'today'
          });
        }
      },
      preConfirm: () => {
        const nombre = (document.getElementById('sw-n').value || '').trim();
        const habitacion = (document.getElementById('sw-h').value || '').trim();
        const dates = (document.getElementById('sw-dates').value || '').trim();
        const { check_in, check_out } = parseRange(dates);

        if (!nombre) {
          Swal.showValidationMessage('Por favor ingresa el nombre del huésped.');
          return false;
        }
        if (!habitacion) {
          Swal.showValidationMessage('Por favor selecciona una habitación.');
          return false;
        }
        if (!check_in || !check_out) {
          Swal.showValidationMessage('Por favor selecciona un rango de fechas (check-in y check-out).');
          return false;
        }

        return { nombre, habitacion, check_in, check_out };
      }
    });

    if (v) {
      // huésped: attach primary linked wallet (so "Mis reservas" can be resolved)
      const rol = HotelSys?.core?.session?.get?.()?.rol;
      if (rol === 'huesped') {
        try {
          const me = await clients.api.get('/me');
          const primary = (me.wallets || []).find(w => Number(w.is_primary) === 1) || (me.wallets || [])[0];
          if (primary?.wallet) v.wallet = primary.wallet;
        } catch {}
      }

      await clients.api.post('/reservas', v);
      // add to history
      try {
        if (HotelSys.core?.historyStore?.add) {
          HotelSys.core.historyStore.add({
            type: 'reserva',
            title: 'Reserva creada',
            habitacion: v.habitacion,
            check_in: v.check_in,
            check_out: v.check_out,
            notes: `Huésped: ${v.nombre}`
          });
        }
      } catch {}
      return true;
    }
    return false;
  }

  return { open, openPrefill };
})();
