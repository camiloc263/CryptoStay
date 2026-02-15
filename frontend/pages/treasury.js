import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { Button, Card, Input, Pill } from '../components/ui';
import { connectWallet, shortAddr } from '../lib/web3';
import { treasuryAddress, usdcAddress, rewardsAddress, govAddress, buybackAddress } from '../config';
import {
  distributeEth,
  distributeUsdc,
  fundBuybackEngine,
  getTreasurySnapshot,
  sellAndBurnRwd,
} from '../lib/services/treasuryService';
import {
  getRecentBuybackEvents,
  getRecentTreasuryEvents,
  shortAddr as evShortAddr,
  shortHash as evShortHash,
} from '../lib/services/eventsService';

export default function TreasuryPage() {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);

  const [ethBal, setEthBal] = useState('0');
  const [usdcBal, setUsdcBal] = useState('0');
  const [hotelWallet, setHotelWallet] = useState('');
  const [staffWallet, setStaffWallet] = useState('');
  const [bps, setBps] = useState({ hotel: 0, staff: 0, buyback: 0 });

  const [distAmountEth, setDistAmountEth] = useState('0.01');
  const [distTokenAddr, setDistTokenAddr] = useState(usdcAddress);
  const [distTokenAmount, setDistTokenAmount] = useState('10');

  // Buyback demo
  const [engineEth, setEngineEth] = useState('0');
  const [fundEngineEth, setFundEngineEth] = useState('0.01');
  const [sellRwd, setSellRwd] = useState('1');

  // Event timeline
  const [eventsLookback, setEventsLookback] = useState('2000');
  const [treasuryEvents, setTreasuryEvents] = useState([]);
  const [buybackEvents, setBuybackEvents] = useState([]);

  async function onConnect() {
    setErr(null);
    setLoading(true);
    try {
      const w = await connectWallet();
      setAccount(w.account);
      setProvider(w.provider);
      setSigner(w.signer);
      setC(w.contracts);
    } catch (e) {
      setErr(e?.message || String(e));
    }
    setLoading(false);
  }

  async function refresh() {
    if (!provider || !c) return;
    setErr(null);
    try {
      const snap = await getTreasurySnapshot({ provider, contracts: c });
      setEthBal(snap.balances.eth);
      setUsdcBal(snap.balances.usdc);
      setEngineEth(snap.balances.buybackEngineEth);
      setHotelWallet(snap.wallets.hotel);
      setStaffWallet(snap.wallets.staff);
      setBps(snap.bps);
    } catch (e) {
      setErr(e?.reason || e?.message || 'Error leyendo Treasury');
    }
  }

  async function refreshEvents() {
    if (!provider || !c) return;
    try {
      const lookback = Number(eventsLookback || 2000);
      const [t, b] = await Promise.all([
        getRecentTreasuryEvents({ provider, contracts: c, lookbackBlocks: lookback }),
        getRecentBuybackEvents({ provider, contracts: c, lookbackBlocks: lookback }),
      ]);
      setTreasuryEvents((t.events || []).slice(0, 12));
      setBuybackEvents((b.events || []).slice(0, 12));
    } catch {
      // silent
    }
  }

  useEffect(() => {
    refresh();
    refreshEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, c]);

  async function onDistributeEth() {
    if (!c) return;
    setLoading(true);
    setErr(null);
    try {
      await distributeEth({ contracts: c, amountEth: distAmountEth });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo distribuir ETH');
    }
    setLoading(false);
  }

  async function onDistributeUsdc() {
    if (!c) return;
    setLoading(true);
    setErr(null);
    try {
      const addr = String(distTokenAddr || '').trim();
      if (addr.toLowerCase() !== usdcAddress.toLowerCase()) throw new Error('Por ahora demo soporta USDC (MockUSDC).');
      await distributeUsdc({ contracts: c, amountUsdc: distTokenAmount });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo distribuir ERC20');
    }
    setLoading(false);
  }

  async function onFundEngine() {
    if (!c || !signer) return;
    setLoading(true);
    setErr(null);
    try {
      await fundBuybackEngine({ signer, amountEth: fundEngineEth });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo fondear el BuybackEngine');
    }
    setLoading(false);
  }

  async function onSellAndBurn() {
    if (!c) return;
    setLoading(true);
    setErr(null);
    try {
      await sellAndBurnRwd({ contracts: c, amountRwd: sellRwd });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo ejecutar buyback & burn');
    }
    setLoading(false);
  }

  const info = useMemo(() => ([
    { k: 'Treasury', v: treasuryAddress },
    { k: 'BuybackEngine', v: buybackAddress },
    { k: 'USDC', v: usdcAddress },
    { k: 'Rewards', v: rewardsAddress },
    { k: 'GovToken', v: govAddress },
  ]), []);

  return (
    <Layout title="Treasury â€¢ ingresos transparentes (60/30/10)">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={onConnect} disabled={loading}>
          {account ? `Conectado: ${shortAddr(account)}` : 'Conectar MetaMask'}
        </Button>
        <Button variant="ghost" onClick={refresh} disabled={!account || loading}>Refrescar</Button>
        {err && <span className="text-sm font-semibold text-red-600">{err}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">Balances</div>
            <Pill tone="blue">On-chain</Pill>
          </div>
          <div className="text-sm text-slate-600">ETH: <b>{Number(ethBal).toFixed(6)}</b></div>
          <div className="text-sm text-slate-600">USDC: <b>{Number(usdcBal).toFixed(2)}</b></div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 font-extrabold">Split</div>
          <div className="text-sm text-slate-600">Hotel: <b>{bps.hotel}</b> bps</div>
          <div className="text-sm text-slate-600">Staff: <b>{bps.staff}</b> bps</div>
          <div className="text-sm text-slate-600">Buyback: <b>{bps.buyback}</b> bps</div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 font-extrabold">Wallets</div>
          <div className="text-xs text-slate-500">Hotel</div>
          <div className="text-sm font-semibold">{hotelWallet ? shortAddr(hotelWallet) : 'â€”'}</div>
          <div className="mt-2 text-xs text-slate-500">Staff</div>
          <div className="text-sm font-semibold">{staffWallet ? shortAddr(staffWallet) : 'â€”'}</div>
        </Card>

        <Card className="p-4 md:col-span-3">
          <div className="mb-3 font-extrabold">Acciones (demo)</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-extrabold text-slate-800">Distribuir ETH</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input value={distAmountEth} onChange={(e) => setDistAmountEth(e.target.value)} placeholder="0.01" />
                <Button onClick={onDistributeEth} disabled={!account || loading}>Distribuir</Button>
              </div>
              <div className="mt-2 text-xs text-slate-500">EnvÃ­a ETH al Treasury y ejecuta el split 60/30/10.</div>
            </div>

            <div>
              <div className="mb-2 text-sm font-extrabold text-slate-800">Distribuir ERC20 (USDC)</div>
              <div className="grid gap-2">
                <Input value={distTokenAddr} onChange={(e) => setDistTokenAddr(e.target.value)} placeholder="Token address" />
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={distTokenAmount} onChange={(e) => setDistTokenAmount(e.target.value)} placeholder="10" />
                  <Button onClick={onDistributeUsdc} disabled={!account || loading}>Distribuir</Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">Demo: approve + distributeERC20(USDC, amount).</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-extrabold">Buyback &amp; Burn (demo)</div>
            <Pill tone="green">RWD burn</Pill>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-extrabold text-slate-800">1) Fondear BuybackEngine (ETH)</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input value={fundEngineEth} onChange={(e) => setFundEngineEth(e.target.value)} placeholder="0.01" />
                <Button onClick={onFundEngine} disabled={!account || loading}>Fondear</Button>
              </div>
              <div className="mt-2 text-xs text-slate-500">Balance engine: <b>{Number(engineEth).toFixed(6)} ETH</b></div>
            </div>

            <div>
              <div className="text-sm font-extrabold text-slate-800">2) Vender RWD y quemar</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input value={sellRwd} onChange={(e) => setSellRwd(e.target.value)} placeholder="1" />
                <Button onClick={onSellAndBurn} disabled={!account || loading}>Ejecutar</Button>
              </div>
              <div className="mt-2 text-xs text-slate-500">Flujo: approve(RWD) â†’ sellAndBurn() â†’ burn + pago ETH.</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <b>CÃ³mo demuestra el pilar:</b> los ingresos (Treasury) reservan un bucket de recompras (10%).
            Ese budget puede financiar recompras de RWD y quemarlas, reduciendo supply con evidencia on-chain (evento BoughtBackAndBurned).
          </div>
        </Card>

        <Card className="p-4 md:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-extrabold">Eventos recientes (evidencia on-chain)</div>
              <div className="text-xs text-slate-500">Treasury + BuybackEngine</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-extrabold text-slate-600">Lookback</div>
              <Input value={eventsLookback} onChange={(e)=>setEventsLookback(e.target.value)} className="max-w-[120px]" />
              <Button variant="ghost" onClick={refreshEvents} disabled={!account || loading}>Refrescar eventos</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-extrabold">Treasury</div>
                <Pill tone="blue">logs</Pill>
              </div>
              {treasuryEvents.length === 0 ? (
                <div className="text-sm text-slate-600">Sin eventos recientes.</div>
              ) : (
                <div className="grid gap-2">
                  {treasuryEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <div className="text-xs font-extrabold text-slate-800">{ev.name}</div>
                        <div className="text-xs text-slate-500">block #{ev.blockNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-700">{evShortHash(ev.txHash)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-extrabold">BuybackEngine</div>
                <Pill tone="green">burn</Pill>
              </div>
              {buybackEvents.length === 0 ? (
                <div className="text-sm text-slate-600">Sin eventos recientes.</div>
              ) : (
                <div className="grid gap-2">
                  {buybackEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <div className="text-xs font-extrabold text-slate-800">{ev.name}</div>
                        <div className="text-xs text-slate-500">block #{ev.blockNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-700">{evShortHash(ev.txHash)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 md:col-span-3">
          <div className="mb-2 font-extrabold">Direcciones (componibilidad)</div>
          <div className="grid gap-2 md:grid-cols-2">
            {info.map((x) => (
              <div key={x.k} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-sm font-extrabold">{x.k}</div>
                <div className="text-xs font-mono text-slate-600">{shortAddr(x.v)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

