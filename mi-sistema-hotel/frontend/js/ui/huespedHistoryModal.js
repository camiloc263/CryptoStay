window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.huespedHistoryModal = (function(){
  const fmtDateTime = (ms) => {
    try { return new Date(ms).toLocaleString(); } catch { return String(ms); }
  };

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function open(){
    const items = HotelSys.core?.historyStore?.load?.() || [];

    const rows = items.length
      ? items.map(it => `
        <div class="hs-hist-item">
          <div class="hs-hist-top">
            <div class="hs-hist-title">${esc(it.title || it.type || 'Evento')}</div>
            <div class="hs-hist-time">${esc(fmtDateTime(it.at))}</div>
          </div>
          <div class="hs-hist-body">
            ${it.habitacion ? `<div><b>Habitación:</b> ${esc(it.habitacion)}</div>` : ''}
            ${it.check_in ? `<div><b>Fechas:</b> ${esc(it.check_in)} → ${esc(it.check_out || '')}</div>` : ''}
            ${it.status ? `<div><b>Estado:</b> ${esc(it.status)}</div>` : ''}
            ${it.notes ? `<div class="hs-hist-notes">${esc(it.notes)}</div>` : ''}
          </div>
        </div>
      `).join('')
      : `<div class="hs-muted">Aún no hay historial. Cuando crees reservas, se verán aquí.</div>`;

    return Swal.fire({
      title: 'Historial',
      html: `
        <div class="hs-hist">
          ${rows}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Limpiar historial',
      cancelButtonText: 'Cerrar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' },
      preConfirm: () => {
        HotelSys.core?.historyStore?.clear?.();
      }
    });
  }

  return { open };
})();
