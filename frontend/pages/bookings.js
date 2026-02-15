import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { Button, Card, Input, Pill } from '../components/ui';
import { connectWallet, shortAddr } from '../lib/web3';
import {
  enrichBookings,
  formatAmount,
  formatDateRange,
  isEth,
  isUsdc,
  scanOwnedBookings,
  shortHash,
} from '../lib/services/bookingsService';

const WEB2_API = process.env.NEXT_PUBLIC_WEB2_API || 'http://127.0.0.1:3000/api';
const LOOKBACK_BLOCKS = Number(process.env.NEXT_PUBLIC_TX_LOOKBACK_BLOCKS || 5000);

export default function BookingsPage() {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);

  const [items, setItems] = useState([]);
  const [scanLimit, setScanLimit] = useState('50');

  async function onConnect() {
    setErr(null);
    setLoading(true);
    try {
      const w = await connectWallet();
      setAccount(w.account);
      setProvider(w.provider);
      setC(w.contracts);
    } catch (e) {
      setErr(e?.message || String(e));
    }
    setLoading(false);
  }

  async function loadMyBookings() {
    if (!c || !account || !provider) return;
    setErr(null);
    setLoading(true);

    try {
      // 1) scan
      const owned = await scanOwnedBookings({ booking: c.booking, account, scanLimit: Number(scanLimit || 50) });

      // 2) enrich (web2 + txHash)
      const enriched = await enrichBookings({
        items: owned,
        provider,
        hotelV2: c.hotelV2,
        web2Api: WEB2_API,
        lookbackBlocks: LOOKBACK_BLOCKS,
      });

      setItems(enriched);
    } catch (e) {
      console.error(e);
      setErr(e?.reason || e?.message || 'No se pudo cargar BookingNFT');
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMyBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, account]);

  const stats = useMemo(() => {
    const paidEth = items.filter(x => isEth(x.meta?.paidToken)).length;
    const paidUsdc = items.filter(x => isUsdc(x.meta?.paidToken)).length;
    return { total: items.length, paidEth, paidUsdc };
  }, [items]);

  return (
    <Layout title="Mis BookingNFT • listado premium (on-chain + Web2)">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={onConnect} disabled={loading}>
          {account ? `Conectado: ${shortAddr(account)}` : 'Conectar MetaMask'}
        </Button>
        <Button variant="ghost" onClick={loadMyBookings} disabled={!account || loading}>Refrescar</Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="text-xs font-extrabold text-slate-600">Escanear últimos</div>
          <Input value={scanLimit} onChange={(e) => setScanLimit(e.target.value)} className="max-w-[110px]" />
          <Pill tone="blue">Total: {stats.total}</Pill>
          {stats.total > 0 && (
            <Pill tone="gray">ETH: {stats.paidEth} • USDC: {stats.paidUsdc}</Pill>
          )}
        </div>

        {err && <div className="w-full text-sm font-semibold text-red-600">{err}</div>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(!account) && (
          <Card className="p-4 md:col-span-2">
            <div className="text-sm text-slate-600">Conecta tu wallet para ver tus BookingNFT.</div>
          </Card>
        )}

        {(account && items.length === 0) && (
          <Card className="p-4 md:col-span-2">
            <div className="font-extrabold">Aún no tienes BookingNFT</div>
            <div className="mt-1 text-sm text-slate-600">
              Haz un pago con HotelV2 para mintear un receipt (BookingNFT).
            </div>
          </Card>
        )}

        {items.map((it) => (
          <Card key={it.tokenId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">Reserva #{it.reservaId}</div>
                <div className="text-xs text-slate-500">Token #{it.tokenId} • wallet {shortAddr(account)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="blue">BookingNFT</Pill>
                <Pill tone={isEth(it.meta.paidToken) ? 'gray' : 'green'}>
                  {isEth(it.meta.paidToken) ? 'Pago: ETH' : 'Pago: USDC'}
                </Pill>
              </div>
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <Row label="Habitación" value={String(it.web2?.habitacion_numero || '—')} />
              <Row label="Fechas" value={formatDateRange(it.web2?.check_in, it.web2?.check_out)} />
              <Row label="Noches" value={String(it.web2?.noches ?? it.meta?.noches ?? '—')} />
              <Row label="Monto" value={formatAmount(it.meta?.paidToken, it.meta?.amount)} />
              <Row label="TxHash" value={it.txHash ? shortHash(it.txHash) : '—'} mono />
            </div>

            <div className="mt-3 text-xs text-slate-500">
              <b>Prueba:</b> ownerOf(Book#{it.tokenId}) = tu wallet. El pago queda registrado por txHash.
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-2 font-extrabold">Notas</div>
        <ul className="list-disc pl-5 text-sm text-slate-600">
          <li>Las fechas/habitación vienen de Web2 (MySQL) para una demo completa (Web2 + Web3).</li>
          <li>La prueba de propiedad (BookingNFT) y la transacción (txHash) vienen de la cadena local (Hardhat).</li>
          <li>Si no aparece txHash: sube el “Escanear últimos” o vuelve a hacer un pago V2 para generar eventos recientes.</li>
        </ul>
      </Card>
    </Layout>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-extrabold text-slate-500">{label}</div>
      <div className={mono ? 'text-xs font-mono text-slate-700' : 'text-sm font-semibold text-slate-800'}>{value}</div>
    </div>
  );
}
