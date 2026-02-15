window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.releaseModal = (function(){
  const clients = HotelSys.core?.clients;
  const fmtUSD = HotelSys.utils?.fmtUSD || ((n)=>String(n));

  async function open({ numero, cambioEstado, obtenerReservaPendientePorHabitacion, onRefresh }){
    let isGuest = false;
    try {
        const s = HotelSys.core.session.get();
        if (s?.rol === 'huesped') isGuest = true;
    } catch {}

    let reserva = null;
    try {
      reserva = await obtenerReservaPendientePorHabitacion(numero);
    } catch {
      reserva = null;
    }

    // If there is no "pending" reserva, try to load the latest reserva for this room
    // so we can show status (pagada, etc.) in the modal.
    if (!reserva) {
      try {
        const latest = await clients.api.get('/reservas');
        const match = (latest || []).find(x => String(x.habitacion_numero) === String(numero) && String(x.estado_reserva || 'activa') === 'activa');
        if (match) reserva = match;
      } catch {}
    }

    const rid = reserva ? String(reserva.id) : '(sin reserva)';
    const montoDemo = (reserva && reserva.monto_eth) ? String(reserva.monto_eth) : '0.01';

    const isPaid = String(reserva?.estado_pago || '').toLowerCase() === 'pagada';

    // web3 config (only to display address + faucet/sbt)
    let web3cfg = null;
    try { web3cfg = await clients.web3.getConfig(); } catch { web3cfg = null; }
    // show which hotel contract is active
    let activeHotelShort = null;
    try {
      const sel = HotelSys.web3.selectHotelContract(web3cfg);
      activeHotelShort = sel?.address ? `${sel.address.slice(0, 8)}…${sel.address.slice(-6)}` : null;
    } catch {}

    // compute USD + crypto totals (if possible)
    let usdText = null;
    let ethText = null;
    let usdcText = null;
    try {
      const [rates, rooms] = await Promise.all([
        clients.rates.get(),
        clients.habitaciones.list(),
      ]);
      const room = (rooms || []).find(x => String(x.numero) === String(numero));
      const noches = Number(reserva?.noches || 0);
      const precioCOP = Number(room?.precio_cop || 0);

      if (noches > 0 && precioCOP > 0 && rates?.usd_cop && rates?.eth_usd) {
        const totalCOP = precioCOP * noches;
        const usdTotal = totalCOP / Number(rates.usd_cop);
        const ethTotal = usdTotal / Number(rates.eth_usd);
        const usdcTotal = usdTotal;
        usdText = fmtUSD(usdTotal);
        ethText = `${ethTotal.toFixed(6)} ETH`;
        usdcText = `${usdcTotal.toFixed(2)} mUSDC`;
      }
    } catch {}

    const shortHotel = activeHotelShort || (web3cfg?.hotelAddress ? `${web3cfg.hotelAddress.slice(0, 8)}…${web3cfg.hotelAddress.slice(-6)}` : null);

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
              ${(ethText || usdcText)
                ? `<div class="hs-crypto">${ethText ? `<b>${ethText}</b>` : ''}${(ethText && usdcText) ? ' • ' : ''}${usdcText ? `<b>${usdcText}</b>` : ''}</div>`
                : `<div class="hs-muted">(demo • mismo valor para ETH o mUSDC)</div>`}
            </div>
          </div>
          ${shortHotel ? `
          <div class="hs-kv hs-kv-wide">
            <div class="hs-k">Contrato (solo info)</div>
            <div class="hs-v"><code class="hs-code">${shortHotel}</code></div>
          </div>
          ` : ''}
        </div>

        ${isPaid ? `
        <div class="hs-release-tip" style="border-left-color:#22c55e">
          <div class="hs-tip-title">Estado</div>
          <div class="hs-tip-text"><b>Pagado</b>. El pago ya fue confirmado. Ahora puedes finalizar la salida.</div>
        </div>
        ` : `
        <div class="hs-release-tip">
          <div class="hs-tip-title">Recomendado</div>
          <div class="hs-tip-text">Si el huésped va a pagar ahora, usa <b>Pagar</b>. Si ya pagó por otro medio, usa <b>Liberar sin pago</b>.</div>
        </div>
        `}

        <div class="hs-release-actions">
          ${isPaid ? '' : `
          <button id="btn-go-pay" class="hs-act hs-act-primary" type="button">
            <i class="fa-solid fa-credit-card"></i>
            <div class="hs-act-text">
              <div class="hs-act-title">Pagar</div>
              <div class="hs-act-sub">Ir a opciones de pago (USD + cripto)</div>
            </div>
          </button>
          `}

          ${isPaid ? `
          <button id="btn-invoice" class="hs-act hs-act-primary" type="button">
            <i class="fa-solid fa-file-invoice"></i>
            <div class="hs-act-text">
              <div class="hs-act-title">Ver factura</div>
              <div class="hs-act-sub">Imprimir o guardar</div>
            </div>
          </button>
          ` : ''}

          <button id="btn-liberar" class="hs-act hs-act-info" type="button">
            <i class="fa-solid fa-unlock"></i>
            <div class="hs-act-text">
              <div class="hs-act-title">${isPaid ? 'Finalizar salida' : 'Liberar sin pago'}</div>
              <div class="hs-act-sub">${isPaid ? 'Marcar habitación como disponible' : 'Marca salida sin registrar pago'}</div>
            </div>
          </button>

          ${isPaid ? '' : `
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
          `}
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
      customClass: { popup: 'hs-swal-popup hs-swal-release' },
      didOpen: () => {
        const byId = (id) => document.getElementById(id);

        if (isGuest) {
            const t = document.querySelector('.hs-release-title');
            if (t) t.innerText = 'Gestionar mi reserva';
            const sub = document.querySelector('.hs-release-sub');
            if (sub) sub.innerText = 'Puedes realizar el pago o cancelar tu reserva.';
            byId('btn-liberar')?.remove(); // guests cannot force release without payment
            document.querySelector('.hs-release-dev')?.remove();
            document.querySelector('.hs-release-tip')?.remove();
        }

        const ensureReserva = async () => {
          if (reserva) return reserva;
          // try pending first
          reserva = await obtenerReservaPendientePorHabitacion(numero);
          if (reserva) return reserva;
          // fallback latest
          try {
            const latest = await clients.api.get('/reservas');
            const match = (latest || []).find(x => String(x.habitacion_numero) === String(numero) && String(x.estado_reserva || 'activa') === 'activa');
            if (match) reserva = match;
          } catch {}
          return reserva;
        };

        byId('btn-go-pay')?.addEventListener('click', async () => {
          try {
            const rsv = await ensureReserva();
            window.open(`/app/pago.html?reservaId=${encodeURIComponent(rsv.id)}&habitacion=${encodeURIComponent(numero)}`, '_blank');
          } catch {
            Swal.fire('Info', 'No hay reserva pendiente para pagar.', 'info');
          }
        });

        byId('btn-invoice')?.addEventListener('click', async () => {
          try {
            const rsv = await ensureReserva();
            if (!rsv?.id) return Swal.fire('Info', 'No hay reserva para mostrar factura.', 'info');
            // Open payment page in "paid" mode; it already supports showing invoice when reserva está pagada.
            window.open(`/app/pago.html?reservaId=${encodeURIComponent(rsv.id)}&habitacion=${encodeURIComponent(numero)}`, '_blank');
          } catch {
            Swal.fire('Info', 'No hay reserva para mostrar factura.', 'info');
          }
        });

        byId('btn-liberar')?.addEventListener('click', async () => {
          try { Swal.close(); } catch {}
          await cambioEstado('/liberar', numero);

          // After checkout, ask guest for rating/comment (optional)
          try {
            const rsv = await ensureReserva();
            if (HotelSys.ui?.reviewModal?.open) {
              await HotelSys.ui.reviewModal.open({ habitacion_numero: numero, reserva_id: rsv?.id || null });
            }
          } catch {}

          try { onRefresh && onRefresh(); } catch {}
        });

        byId('btn-cancelar')?.addEventListener('click', async () => {
          try { Swal.close(); } catch {}
          try {
            const rsv = await ensureReserva();
            await clients.api.post('/reservas/cancelar', { reservaId: rsv.id });
            await Swal.fire('Listo', `Reserva #${rsv.id} cancelada`, 'success');
            if (onRefresh) onRefresh();
            else if (cambioEstado) cambioEstado(null, null); // fallback to trigger refresh if changed to allow null
            else location.reload();
          } catch {
            Swal.fire('Info', 'No hay reserva pendiente para cancelar.', 'info');
          }
        });

        byId('btn-faucet')?.addEventListener('click', async () => {
          try {
            await HotelSys.web3.ensureHardhatNetwork();
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const cfg = web3cfg || await clients.web3.getConfig();
            const provider = new window.ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const usdc = new window.ethers.Contract(cfg.usdcAddress, cfg.usdcABI, signer);
            const me = await signer.getAddress();
            const tx = await usdc.faucet(me, window.ethers.parseUnits('100', 6));
            await tx.wait();
            Swal.fire('OK', 'Faucet: recibiste 100 mUSDC', 'success');
          } catch (e) {
            console.error(e);
            if (HotelSys.web3.isUserRejected(e)) return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask.', 'info');
            Swal.fire('Error', e?.shortMessage || e?.message || 'No se pudo usar faucet', 'error');
          }
        });

        byId('btn-sbt')?.addEventListener('click', async () => {
          try {
            await HotelSys.web3.ensureHardhatNetwork();
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const cfg = web3cfg || await clients.web3.getConfig();
            const provider = new window.ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const sbt = new window.ethers.Contract(cfg.sbtAddress, cfg.sbtABI, signer);
            const me = await signer.getAddress();
            const tx = await sbt.mint(me);
            await tx.wait();
            Swal.fire('OK', 'Membresía activada (SBT)', 'success');
          } catch (e) {
            console.error(e);
            if (HotelSys.web3.isUserRejected(e)) return Swal.fire('Transacción cancelada', 'Cancelaste la firma en MetaMask.', 'info');
            Swal.fire('Error', e?.shortMessage || e?.message || 'No se pudo activar membresía', 'error');
          }
        });
      }
    });
  }

  return { open };
})();
