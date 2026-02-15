// SOLID refactor: shared utilities/clients under window.HotelSys
const API = (window.HotelSys?.core?.clients?.api) || null;
const clients = window.HotelSys?.core?.clients;
const fmtCOP = window.HotelSys?.utils?.fmtCOP || ((n)=>String(n));
const fmtUSD = window.HotelSys?.utils?.fmtUSD || ((n)=>String(n));
const qs = window.HotelSys?.utils?.qs || ((name)=>new URL(window.location.href).searchParams.get(name));

function invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash }){
  const ci = reserva.check_in ? new Date(reserva.check_in).toLocaleDateString('es-CO') : '—';
  const co = reserva.check_out ? new Date(reserva.check_out).toLocaleDateString('es-CO') : '—';
  const paidAt = reserva.paid_at ? new Date(reserva.paid_at).toLocaleString('es-CO') : '—';
  const guest = reserva.nombre || '—';
  const roomNum = reserva.habitacion_numero || reserva.habitacion;
  const title = room?.titulo || `Habitación ${roomNum}`;

  const th = txHash || reserva.tx_hash || '—';

  return `
    <div style="text-align:left">
      <div style="font-weight:950;font-size:18px;margin-bottom:4px">Factura de pago</div>
      <div style="color:rgba(15,23,42,0.65);font-size:12px;margin-bottom:12px">Reserva #${reserva.id} • ${title}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:10px 12px;background:rgba(15,23,42,0.02)">
          <div style="font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:rgba(15,23,42,0.55)">Huésped</div>
          <div style="margin-top:6px;font-weight:950;color:#0f172a">${guest}</div>
        </div>
        <div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:10px 12px;background:rgba(15,23,42,0.02)">
          <div style="font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:rgba(15,23,42,0.55)">Fecha de pago</div>
          <div style="margin-top:6px;font-weight:950;color:#0f172a">${paidAt}</div>
        </div>
        <div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:10px 12px;background:rgba(15,23,42,0.02)">
          <div style="font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:rgba(15,23,42,0.55)">Llegada</div>
          <div style="margin-top:6px;font-weight:950;color:#0f172a">${ci}</div>
        </div>
        <div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:10px 12px;background:rgba(15,23,42,0.02)">
          <div style="font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:rgba(15,23,42,0.55)">Salida</div>
          <div style="margin-top:6px;font-weight:950;color:#0f172a">${co}</div>
        </div>
      </div>

      <div style="border:1px solid rgba(15,23,42,0.10);border-radius:16px;padding:12px 14px;background:#fff;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <div style="color:rgba(15,23,42,0.70);font-weight:900">Total (USD)</div>
          <div style="font-weight:950;color:#0f172a">${fmtUSD(usd)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:6px">
          <div style="color:rgba(15,23,42,0.55);font-weight:900">Total (COP)</div>
          <div style="font-weight:900;color:rgba(15,23,42,0.85)">${fmtCOP(totalCOP)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:6px">
          <div style="color:rgba(15,23,42,0.55);font-weight:900">Cripto</div>
          <div style="font-weight:950;color:#0f172a">${eth.toFixed(6)} ETH • ${usdc.toFixed(2)} mUSDC</div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;margin-top:6px">
          <div style="color:rgba(15,23,42,0.55);font-weight:900">Noches</div>
          <div style="font-weight:900;color:rgba(15,23,42,0.85)">${noches || '—'}</div>
        </div>
      </div>

      <div style="font-size:12px;color:rgba(15,23,42,0.60)">
        <div><b>TxHash:</b> <code style="word-break:break-all">${th}</code></div>
      </div>
    </div>
  `;
}

function openInvoicePrint(html){
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Factura</title>
    <style>body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial;padding:24px} code{font-family:ui-monospace,Consolas,monospace}</style>
  </head><body>${html}<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
}

async function loadData(){
  const reservaId = qs('reservaId');
  const habitacion = qs('habitacion');
  const statusEl = document.getElementById('pay-status');

  let reserva = null;
  if (reservaId) {
    reserva = await clients.reservas.getById(reservaId);
  } else if (habitacion) {
    reserva = await clients.reservas.getPendienteByHabitacion(habitacion);
  } else {
    throw new Error('Falta reservaId o habitacion en la URL');
  }

  const rooms = await clients.habitaciones.list();
  const room = (rooms || []).find(x => String(x.numero) === String(reserva.habitacion_numero || reserva.habitacion));

  const noches = Number(reserva.noches || 0);
  const precioCOP = Number(room?.precio_cop || 0);
  const totalCOP = precioCOP && noches ? (precioCOP * noches) : 0;

  const rates = await clients.rates.get();
  const usd = totalCOP ? (totalCOP / Number(rates.usd_cop || 4000)) : 0;
  const eth = usd ? (usd / Number(rates.eth_usd || 2500)) : 0;
  const usdc = usd;

  // render card (Airbnb-like)
  const card = document.getElementById('pay-card');
  const ci = reserva.check_in ? new Date(reserva.check_in).toLocaleDateString('es-CO') : '—';
  const co = reserva.check_out ? new Date(reserva.check_out).toLocaleDateString('es-CO') : '—';

  card.innerHTML = `
    <div class="pay-price">${fmtUSD(usd)} <span>por ${noches || '—'} noches</span></div>
    <div class="pay-cop">${fmtCOP(totalCOP)} COP</div>

    <div class="pay-box">
      <div class="pay-box-row">
        <div class="pay-box-col">
          <div class="pay-label">Llegada</div>
          <div class="pay-val">${ci}</div>
        </div>
        <div class="pay-box-col">
          <div class="pay-label">Salida</div>
          <div class="pay-val">${co}</div>
        </div>
      </div>
      <div class="pay-box-row pay-box-row2">
        <div class="pay-box-col2">
          <div class="pay-label">Huéspedes</div>
          <div class="pay-val">1 huésped</div>
        </div>
      </div>
    </div>

    <div class="pay-muted">Cripto: <b>${eth.toFixed(6)} ETH</b> • <b>${usdc.toFixed(2)} mUSDC</b></div>
    <div class="pay-muted2">Reserva #${reserva.id} • Habitación ${reserva.habitacion_numero}</div>
  `;

  document.getElementById('eth-sub').textContent = `${eth.toFixed(6)} ETH (≈ ${fmtUSD(usd)})`;
  document.getElementById('usdc-sub').textContent = `${usdc.toFixed(2)} mUSDC (≈ ${fmtUSD(usd)})`;

  if (statusEl) statusEl.textContent = (String(reserva.estado_pago || '').toLowerCase() === 'pagada') ? 'Pagada' : 'Pendiente de pago';

  const isPaid = (String(reserva.estado_pago || '').toLowerCase() === 'pagada');

  const btnEth = document.getElementById('btn-pay-eth');
  const btnUsdc = document.getElementById('btn-pay-usdc');
  const paidWrap = document.getElementById('pay-paid');
  const invoiceBtn = document.getElementById('btn-invoice');

  const lockPayments = () => {
    if (btnEth) btnEth.disabled = true;
    if (btnUsdc) btnUsdc.disabled = true;
    if (paidWrap) paidWrap.style.display = 'block';
  };

  const showInvoice = async (title, icon='info') => {
    // refresh reserva to get paid_at/tx_hash if available
    try{
      const rr = await fetch(`${API_URL}/reservas/${reserva.id}`);
      reserva = await rr.json();
    } catch {}

    const html = invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash: reserva.tx_hash });
    return Swal.fire({
      title,
      html,
      icon,
      showCancelButton: true,
      confirmButtonText: 'Imprimir factura',
      cancelButtonText: 'Cerrar',
      focusConfirm: false,
      customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
    }).then(r => { if (r.isConfirmed) openInvoicePrint(html); });
  };

  if (isPaid) {
    if (statusEl) statusEl.textContent = 'Pagada';
    lockPayments();
    invoiceBtn?.addEventListener('click', () => showInvoice('Factura', 'success'));
  }

  // actions
  const isUserRejected = (e) => {
    const code = e?.code ?? e?.info?.error?.code;
    const msg = String(e?.shortMessage || e?.message || e?.info?.error?.message || '').toLowerCase();
    return code === 4001 || msg.includes('user denied') || msg.includes('rejected') || msg.includes('denied');
  };

  document.getElementById('btn-pay-eth').addEventListener('click', async () => {
    if (String(reserva.estado_pago || '').toLowerCase() === 'pagada') {
      lockPayments();
      return showInvoice('Esta reserva ya está pagada', 'info');
    }
    try{
      statusEl.textContent = 'Pagando…';
      const txHash = await window.HotelSys.web3.paymentFacade.payETH({ reservaId: reserva.id, amountEth: String(eth || 0) });
      try {
        await clients.reservas.confirmarPago(reserva.id, txHash);
      } catch (e) {
        if (e?.status === 409 || String(e?.message || '').toLowerCase().includes('ya pagada')) {
          lockPayments();
          return showInvoice('Esta reserva ya está pagada', 'info');
        }
        throw e;
      }

      // refresh reserva to get paid_at/tx_hash
      try{ reserva = await clients.reservas.getById(reserva.id); } catch {}

      statusEl.textContent = 'Pagada';

      const html = invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash });
      await Swal.fire({
        title: 'Pago confirmado',
        html,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Imprimir factura',
        cancelButtonText: 'Cerrar',
        focusConfirm: false,
        customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
      }).then(r => { if (r.isConfirmed) openInvoicePrint(html); });
    }catch(e){
      // Normalize MetaMask "too many errors" into our RPC_DOWN to avoid noisy console stack traces
      try {
        const nestedCode = e?.info?.error?.code;
        const nestedMsg = String(e?.info?.error?.message || '').toLowerCase();
        if (nestedCode === -32002 || nestedMsg.includes('too many errors') || nestedMsg.includes('rpc endpoint returned too many errors')) {
          e.code = 'RPC_DOWN';
        }
      } catch {}

      // suppress noisy RPC errors (MetaMask rate limiting) and show friendly message
      if (e?.code !== 'RPC_DOWN') console.error(e);
      if (isUserRejected(e)) {
        statusEl.textContent = 'Cancelado';
        return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask. No se realizó ningún cobro.', 'info');
      }
      const msg = String(e?.shortMessage || e?.message || e?.info?.error?.message || '');
      if (msg.toLowerCase().includes('reserva ya pagada') || msg.toLowerCase().includes('already paid')) {
        statusEl.textContent = 'Pagada';
        // show invoice using existing tx_hash
        const html = invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash: reserva.tx_hash });
        return Swal.fire({
          title: 'Esta reserva ya está pagada',
          html,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Imprimir factura',
          cancelButtonText: 'Cerrar',
          focusConfirm: false,
          customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
        }).then(r => { if (r.isConfirmed) openInvoicePrint(html); });
      }
      statusEl.textContent = 'Error';
      if (e?.code === 'RPC_DOWN') {
        return Swal.fire('Sin conexión a Hardhat', e.message, 'warning');
      }
      Swal.fire('Error', msg || 'No se pudo pagar con ETH', 'error');
    }
  });

  document.getElementById('btn-pay-usdc').addEventListener('click', async () => {
    if (String(reserva.estado_pago || '').toLowerCase() === 'pagada') {
      lockPayments();
      return showInvoice('Esta reserva ya está pagada', 'info');
    }
    try{
      statusEl.textContent = 'Pagando…';
      const txHash = await window.HotelSys.web3.paymentFacade.payUSDC({ reservaId: reserva.id, amountUsdc: String(usdc.toFixed(2)) });
      try {
        await clients.reservas.confirmarPago(reserva.id, txHash);
      } catch (e) {
        if (e?.status === 409 || String(e?.message || '').toLowerCase().includes('ya pagada')) {
          lockPayments();
          return showInvoice('Esta reserva ya está pagada', 'info');
        }
        throw e;
      }

      // refresh reserva to get paid_at/tx_hash
      try{ reserva = await clients.reservas.getById(reserva.id); } catch {}

      statusEl.textContent = 'Pagada';

      const html = invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash });
      await Swal.fire({
        title: 'Pago confirmado',
        html,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Imprimir factura',
        cancelButtonText: 'Cerrar',
        focusConfirm: false,
        customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
      }).then(r => { if (r.isConfirmed) openInvoicePrint(html); });
    }catch(e){
      try {
        const nestedCode = e?.info?.error?.code;
        const nestedMsg = String(e?.info?.error?.message || '').toLowerCase();
        if (nestedCode === -32002 || nestedMsg.includes('too many errors') || nestedMsg.includes('rpc endpoint returned too many errors')) {
          e.code = 'RPC_DOWN';
        }
      } catch {}

      if (e?.code !== 'RPC_DOWN') console.error(e);
      if (isUserRejected(e)) {
        statusEl.textContent = 'Cancelado';
        return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask. No se realizó ningún cobro.', 'info');
      }
      const msg = String(e?.shortMessage || e?.message || e?.info?.error?.message || '');
      if (msg.toLowerCase().includes('reserva ya pagada') || msg.toLowerCase().includes('already paid')) {
        statusEl.textContent = 'Pagada';
        const html = invoiceHtml({ reserva, room, noches, totalCOP, usd, eth, usdc, txHash: reserva.tx_hash });
        return Swal.fire({
          title: 'Esta reserva ya está pagada',
          html,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Imprimir factura',
          cancelButtonText: 'Cerrar',
          focusConfirm: false,
          customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
        }).then(r => { if (r.isConfirmed) openInvoicePrint(html); });
      }
      statusEl.textContent = 'Error';
      if (e?.code === 'RPC_DOWN') {
        return Swal.fire('Sin conexión a Hardhat', e.message, 'warning');
      }
      Swal.fire('Error', msg || 'No se pudo pagar con mUSDC', 'error');
    }
  });
}

function getPanelUrlByRole(){
  const role = String(localStorage.getItem('hs_role') || localStorage.getItem('role') || '').toLowerCase();
  // Admin roles
  if (role === 'administrador' || role === 'gerente' || role === 'aseo') return '/app/';
  // Guest roles
  if (role === 'invitado' || role === 'huesped' || role === 'huésped' || role === 'cliente') return '/app/cliente.html';
  // default
  return '/app/';
}

document.getElementById('btn-back-panel')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = getPanelUrlByRole();
});

// session gate + idle watcher in pago page
try {
  HotelSys.ui.sessionGate.requireSession({
    onMissing: () => {
      // no session -> go to login
      window.location.href = '/app/';
    }
  });
  HotelSys.core.session.startIdleWatcher({
    onWarn: (ms) => {
      const sec = Math.ceil(ms/1000);
      Swal.fire({
        title: '¿Sigues ahí?',
        text: `Tu sesión se cerrará por inactividad en ${sec}s.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Seguir conectado',
        cancelButtonText: 'Salir',
        focusConfirm: false,
        customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' }
      }).then(r => {
        if (r.isConfirmed) HotelSys.core.session.touch();
        else { HotelSys.core.session.clear(); window.location.href = '/app/'; }
      });
    },
    onLogout: () => { HotelSys.core.session.clear(); window.location.href = '/app/'; }
  });
} catch {}


loadData().catch(e => {
  console.error(e);
  document.getElementById('pay-status').textContent = 'Error';
  Swal.fire('Error', e.message || 'No se pudo cargar la página de pago', 'error');
});

