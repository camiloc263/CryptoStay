import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { hotelAddress, hotelABI, usdcAddress, usdcABI, sbtAddress, sbtABI } from '../config';
import { Button, Card, Input, Pill, cx } from '../components/ui';

export default function Home() {
  const WEB2_API = 'http://127.0.0.1:3000/api';

  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  // Extra Web3
  const [usdc, setUsdc] = useState(null);
  const [sbt, setSbt] = useState(null);
  const [hasSbt, setHasSbt] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState('0');

  // UX
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Admin form (Web3: publicar habitaciones)
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');

  // Web2/Web3 flow: reservar (Web2) y pagar después (Web3)
  const [habitacionNumero, setHabitacionNumero] = useState('');
  const [montoEth, setMontoEth] = useState('0.01');
  const [reservaId, setReservaId] = useState('');

  // Lista de reservas Web2
  const [reservas, setReservas] = useState([]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  async function switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x7a69',
              chainName: 'Hardhat Local',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            },
          ],
        });
      }
    }
  }

  // MetaMask account/chain changes
  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccounts = () => window.location.reload();
    const onChain = () => window.location.reload();
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      try { window.ethereum.removeListener('accountsChanged', onAccounts); } catch {}
      try { window.ethereum.removeListener('chainChanged', onChain); } catch {}
    };
  }, []);

  // Web3 contract event listeners (cleanup-safe)
  useEffect(() => {
    if (!contract) return;
    const onCreated = () => {
      loadRooms(contract);
      showNotification('Habitación publicada', 'success');
    };
    const onBooked = () => {
      loadRooms(contract);
      showNotification('Reserva Web3 (legacy) realizada', 'success');
    };

    try { contract.on('RoomCreated', onCreated); } catch {}
    try { contract.on('RoomBooked', onBooked); } catch {}

    return () => {
      try { contract.off('RoomCreated', onCreated); } catch {}
      try { contract.off('RoomBooked', onBooked); } catch {}
    };
  }, [contract]);

  async function connectWallet() {
    if (!window.ethereum) return showNotification('Instala MetaMask', 'error');

    setLoading(true);
    try {
      await switchNetwork();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const code = await provider.getCode(hotelAddress);
      if (code === '0x') {
        setLoading(false);
        return showNotification('Contrato no encontrado. Revisa Hardhat + deploy.', 'error');
      }

      const signer = await provider.getSigner();
      const _hotel = new ethers.Contract(hotelAddress, hotelABI, signer);
      const _usdc = new ethers.Contract(usdcAddress, usdcABI, signer);
      const _sbt = new ethers.Contract(sbtAddress, sbtABI, signer);

      const addr = await signer.getAddress();
      setAccount(addr);
      setContract(_hotel);
      setUsdc(_usdc);
      setSbt(_sbt);

      const owner = await _hotel.owner();
      setIsOwner(owner.toLowerCase() === addr.toLowerCase());

      // Membership + balances
      const bal = await _sbt.balanceOf(addr);
      setHasSbt(Number(bal) > 0);
      const usdcBal = await _usdc.balanceOf(addr);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));

      await loadRooms(_hotel);
      showNotification('Wallet conectada', 'success');
    } catch (e) {
      console.error(e);
      showNotification('Error conectando: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  async function loadRooms(contractInstance) {
    try {
      const count = await contractInstance.roomCount();
      const loaded = [];
      for (let i = 1; i <= Number(count); i++) {
        loaded.push(await contractInstance.rooms(i));
      }
      setRooms(loaded);
    } catch (e) {
      console.error(e);
    }
  }

  async function addRoom() {
    if (!contract) return;
    if (!newRoomName || !newRoomPrice || !newRoomImage) return showNotification('Completa todos los campos', 'error');

    setLoading(true);
    try {
      const formattedPrice = newRoomPrice.replace(',', '.');
      const priceWei = ethers.parseEther(formattedPrice);
      const tx = await contract.addRoom(newRoomName, priceWei, newRoomImage);
      await tx.wait();
      setNewRoomName('');
      setNewRoomPrice('');
      setNewRoomImage('');
      showNotification('Habitación creada', 'success');
    } catch (e) {
      console.error(e);
      showNotification('Error al crear: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  // Legacy: reservar pagando de una (se mantiene para demo)
  async function bookRoom(id, price) {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.bookRoom(id, { value: price });
      await tx.wait();
      showNotification('Reserva Web3 exitosa', 'success');
    } catch (e) {
      console.error(e);
      showNotification('Error en la reserva', 'error');
    }
    setLoading(false);
  }

  async function crearReservaWeb2() {
    if (!account) return showNotification('Conecta MetaMask primero', 'error');
    if (!habitacionNumero) return showNotification('Ingresa el número de habitación (Web2)', 'error');

    setLoading(true);
    try {
      const r = await fetch(`${WEB2_API}/reservas/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitacion_numero: habitacionNumero, wallet: account, monto_eth: montoEth }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo crear la reserva');

      setReservaId(String(data.reservaId));
      showNotification(`Reserva creada (ID ${data.reservaId})`, 'success');
    } catch (e) {
      console.error(e);
      showNotification('Error creando reserva: ' + (e.message || 'unknown'), 'error');
    }
    setLoading(false);
  }

  async function cargarReservas() {
    try {
      const r = await fetch(`${WEB2_API}/reservas`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo cargar reservas');
      setReservas(data);
    } catch (e) {
      console.error(e);
      showNotification('Error cargando reservas Web2', 'error');
    }
  }

  async function cancelarReserva(id) {
    setLoading(true);
    try {
      const r = await fetch(`${WEB2_API}/reservas/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservaId: id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo cancelar');
      showNotification(`Reserva ${id} cancelada`, 'success');
      await cargarReservas();
    } catch (e) {
      console.error(e);
      showNotification('Error cancelando: ' + (e.message || 'unknown'), 'error');
    }
    setLoading(false);
  }

  async function refrescarSaldos() {
    if (!account || !usdc || !sbt) return;
    try {
      const bal = await sbt.balanceOf(account);
      setHasSbt(Number(bal) > 0);
      const usdcBal = await usdc.balanceOf(account);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));
    } catch (e) {
      console.error(e);
    }
  }

  async function faucetUSDC() {
    if (!usdc || !account) return;
    setLoading(true);
    try {
      // 100 USDC
      const tx = await usdc.faucet(account, ethers.parseUnits('100', 6));
      await tx.wait();
      showNotification('Recibiste 100 mUSDC (faucet)', 'success');
      await refrescarSaldos();
    } catch (e) {
      console.error(e);
      showNotification('Error faucet USDC: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  async function mintMembership() {
    if (!sbt || !account) return;
    setLoading(true);
    try {
      const tx = await sbt.mint(account);
      await tx.wait();
      showNotification('Membresía activada (SBT)', 'success');
      await refrescarSaldos();
    } catch (e) {
      console.error(e);
      showNotification('Error mint SBT: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  async function pagarReserva(idToPay) {
    if (!contract) return showNotification('Conecta MetaMask primero', 'error');
    const rid = idToPay ?? reservaId;
    if (!rid) return showNotification('Selecciona una reserva', 'error');

    // prevent double-pay (Web2 guard)
    try {
      const rv = reservas.find(x => String(x.id) === String(rid));
      if (rv && String(rv.estado_pago) !== 'pendiente') {
        return showNotification('Reserva ya pagada', 'error');
      }
    } catch {}

    // validate amount
    const n = Number(String(montoEth || '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      return showNotification('Monto inválido', 'error');
    }

    setLoading(true);
    try {
      const value = ethers.parseEther(String(n));
      const tx = await contract.pagarReserva(rid, { value });
      const receipt = await tx.wait();

      const r = await fetch(`${WEB2_API}/reservas/confirmar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservaId: rid, txHash: receipt.hash, metodo: 'ETH' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo confirmar en Web2');

      showNotification(`Pago ETH confirmado. Tx: ${receipt.hash.slice(0, 10)}…`, 'success');
      await cargarReservas();
      await refrescarSaldos();
    } catch (e) {
      console.error(e);
      showNotification('Error pagando ETH: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  async function pagarReservaUSDC(idToPay) {
    if (!contract || !usdc) return showNotification('Conecta MetaMask primero', 'error');
    const rid = idToPay ?? reservaId;
    if (!rid) return showNotification('Selecciona una reserva', 'error');

    // prevent double-pay (Web2 guard)
    try {
      const rv = reservas.find(x => String(x.id) === String(rid));
      if (rv && String(rv.estado_pago) !== 'pendiente') {
        return showNotification('Reserva ya pagada', 'error');
      }
    } catch {}

    // validate amount
    const n = Number(String(montoEth || '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      return showNotification('Monto inválido', 'error');
    }

    setLoading(true);
    try {
      // Para demo: usamos el mismo campo montoEth como monto en USDC
      const amount = ethers.parseUnits(String(n), 6);

      const tx1 = await usdc.approve(hotelAddress, amount);
      await tx1.wait();

      const tx2 = await contract.pagarReservaUSDC(rid, amount);
      const receipt = await tx2.wait();

      const r = await fetch(`${WEB2_API}/reservas/confirmar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservaId: rid, txHash: receipt.hash, metodo: 'USDC' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo confirmar en Web2');

      showNotification(`Pago USDC confirmado. Tx: ${receipt.hash.slice(0, 10)}…`, 'success');
      await cargarReservas();
      await refrescarSaldos();
    } catch (e) {
      console.error(e);
      showNotification('Error pagando USDC: ' + (e.reason || e.message), 'error');
    }
    setLoading(false);
  }

  const notifTone = notification?.type === 'error' ? 'red' : 'green';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              🏨
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight">CryptoStay</div>
              <div className="text-xs text-gray-500 dark:text-white/50">Web2 (MySQL) + Web3 (ETH)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Pill tone="blue">Hardhat 31337</Pill>
            {!account ? (
              <Button onClick={connectWallet} variant="neutral" disabled={loading}>
                Conectar MetaMask
              </Button>
            ) : (
              <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5 sm:flex">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                {account.substring(0, 6)}…{account.substring(38)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50">
          <div className={cx(
            'rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg',
            notifTone === 'red'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
              : 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100'
          )}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur">
          <div className="rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-gray-900 shadow-xl dark:bg-white/10 dark:text-white">
            Procesando…
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Reservas modernas, pago en <span className="text-brand-600 dark:text-brand-400">Blockchain</span>.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-white/60">
            Flujo recomendado: crea la reserva en Web2 (MySQL) y paga después en Web3 (ETH). También dejamos el modo legacy de reserva 100% on-chain para demo.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-white/50">
            <span className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">Frontend: :3001</span>
            <span className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">Web2 API: :3000</span>
            <span className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5">RPC: :8545</span>
          </div>
        </div>

        {/* Web2 -> Web3 flow */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Reserva (Web2) → Pago (Web3)</div>
                <div className="mt-1 text-xs text-gray-600 dark:text-white/60">
                  Crea una reserva en la BD y luego págala con ETH o mUSDC usando el <span className="font-semibold">reservaId</span>.
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={account ? 'green' : 'gray'}>{account ? 'Wallet conectada' : 'Conecta wallet'}</Pill>
                {account && (
                  <div className="text-xs text-gray-500 dark:text-white/50">
                    mUSDC: <span className="font-semibold">{Number(usdcBalance).toFixed(2)}</span> • Membresía: <span className="font-semibold">{hasSbt ? 'Activa' : 'No'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">Habitación (Web2)</label>
                <Input placeholder="Ej: 101" value={habitacionNumero} onChange={(e) => setHabitacionNumero(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">Monto a pagar (ETH / USDC demo)</label>
                <Input placeholder="0.01" value={montoEth} onChange={(e) => setMontoEth(e.target.value)} />
                <div className="mt-1 text-[11px] text-gray-500 dark:text-white/50">
                  Nota: en demo, este mismo campo se usa para ETH o para mUSDC.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={crearReservaWeb2} disabled={loading || !account}>
                1) Crear reserva (Web2)
              </Button>
              <div className="min-w-[240px] flex-1">
                <Input placeholder="reservaId (auto)" value={reservaId} onChange={(e) => setReservaId(e.target.value)} />
              </div>
              <Button onClick={() => pagarReserva()} variant="neutral" disabled={loading || !account}>
                2) Pagar ETH
              </Button>
              <Button onClick={() => pagarReservaUSDC()} disabled={loading || !account}>
                2) Pagar mUSDC
              </Button>
              <Button onClick={faucetUSDC} variant="ghost" disabled={loading || !account}>
                Faucet mUSDC
              </Button>
              <Button onClick={mintMembership} variant="ghost" disabled={loading || !account || hasSbt}>
                Activar membresía
              </Button>
              <Button onClick={cargarReservas} variant="ghost" disabled={loading}>
                Actualizar lista
              </Button>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-white/50">
              Consejo: si MetaMask muestra “Failed to fetch”, revisa que Hardhat esté corriendo en <span className="font-semibold">127.0.0.1:8545</span>.
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm font-extrabold">Estado del sistema</div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-white/60">Contrato</span>
                <span className="font-mono text-xs">{hotelAddress.slice(0, 10)}…</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-white/60">Modo</span>
                <Pill tone="yellow">ETH + mUSDC</Pill>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-white/60">Rol</span>
                <Pill tone={isOwner ? 'green' : 'gray'}>{isOwner ? 'Owner' : 'Usuario'}</Pill>
              </div>
            </div>
          </Card>
        </div>

        {/* Owner panel (publish rooms) */}
        {isOwner && (
          <Card className="mt-8 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Panel de administración (Web3)</div>
                <div className="mt-1 text-xs text-gray-600 dark:text-white/60">Publica habitaciones on-chain (demo/marketplace).</div>
              </div>
              <Pill tone="green">Owner</Pill>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Input placeholder="Nombre (Ej: Suite)" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
              <Input placeholder="Precio (ETH)" value={newRoomPrice} onChange={(e) => setNewRoomPrice(e.target.value)} />
              <Input placeholder="URL de imagen" value={newRoomImage} onChange={(e) => setNewRoomImage(e.target.value)} />
              <Button onClick={addRoom} disabled={loading}>Publicar</Button>
            </div>
          </Card>
        )}

        {/* Reservas Web2 (pendientes/pagadas/canceladas) */}
        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">Reservas (Web2)</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-white/60">
                Paga con Web3 cuando la reserva esté <span className="font-semibold">pendiente</span>. También puedes cancelarla.
              </div>
            </div>
            <Button variant="ghost" onClick={cargarReservas} disabled={loading}>Refrescar</Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-white/5 dark:text-white/50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Hab</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3">Reserva</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500 dark:text-white/50" colSpan={6}>
                        No hay reservas cargadas. Presiona “Refrescar”.
                      </td>
                    </tr>
                  ) : (
                    reservas.slice(0, 20).map((rv) => {
                      const canPay = rv.estado_pago === 'pendiente' && rv.estado_reserva !== 'cancelada';
                      const isCanceled = rv.estado_reserva === 'cancelada';
                      return (
                        <tr key={rv.id} className="border-t border-gray-200 dark:border-white/10">
                          <td className="px-4 py-3 font-mono text-xs">{rv.id}</td>
                          <td className="px-4 py-3">{rv.habitacion_numero}</td>
                          <td className="px-4 py-3">{rv.monto_eth ?? '-'}</td>
                          <td className="px-4 py-3">
                            <Pill tone={rv.estado_pago === 'pagada' ? 'green' : rv.estado_pago === 'pendiente' ? 'yellow' : 'gray'}>
                              {rv.estado_pago}
                            </Pill>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={isCanceled ? 'red' : 'gray'}>
                              {rv.estado_reserva || 'activa'}
                            </Pill>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="neutral"
                                disabled={!account || !canPay || loading}
                                onClick={() => { setReservaId(String(rv.id)); pagarReserva(String(rv.id)); }}
                              >
                                Pagar ETH
                              </Button>
                              <Button
                                disabled={!account || !canPay || loading}
                                onClick={() => { setReservaId(String(rv.id)); pagarReservaUSDC(String(rv.id)); }}
                              >
                                Pagar mUSDC
                              </Button>
                              <Button
                                variant="danger"
                                disabled={isCanceled || loading}
                                onClick={() => cancelarReserva(rv.id)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Rooms grid */}
        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">Habitaciones on-chain (demo)</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-white/60">Reserva instantánea (legacy) para mostrar interacción con el contrato.</div>
            </div>
            <Button variant="ghost" onClick={() => contract && loadRooms(contract)} disabled={!contract || loading}>
              Refrescar
            </Button>
          </div>

          {rooms.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-sm font-semibold text-gray-700 dark:text-white/80">No hay habitaciones publicadas.</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-white/50">Conecta la wallet (owner) y publica una habitación.</div>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const booked = Boolean(room.isBooked);
                return (
                  <Card key={room.id} className="overflow-hidden">
                    <div
                      className="relative h-44 bg-gray-200 bg-cover bg-center dark:bg-white/10"
                      style={{ backgroundImage: `url(${room.imageUrl || 'https://via.placeholder.com/800'})` }}
                    >
                      <div className="absolute left-3 top-3">
                        <Pill tone={booked ? 'red' : 'green'}>{booked ? 'Ocupada' : 'Disponible'}</Pill>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-extrabold">{room.name}</div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-white/60">Room ID: {String(room.id)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold">{ethers.formatEther(room.pricePerNight)} ETH</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        {booked ? (
                          <Button className="w-full" variant="ghost" disabled>
                            No disponible
                          </Button>
                        ) : (
                          <Button className="w-full" variant="neutral" onClick={() => bookRoom(room.id, room.pricePerNight)} disabled={!contract || loading}>
                            Reservar (legacy)
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10 text-center text-xs text-gray-500 dark:text-white/40">
          Hecho para demo local: mejora UI/UX sin cambiar el flujo. Siguiente paso: “Mis reservas” con listado desde Web2.
        </div>
      </main>
    </div>
  );
}
