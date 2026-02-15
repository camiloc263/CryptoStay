import Link from 'next/link';
import { Card, cx } from './ui';

export default function Layout({ title = 'CryptoStay • Web3 Suite', children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5">
          <Card className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">CryptoStay</div>
                <div className="text-xs font-semibold text-slate-500">Web3 demo suite (Hardhat local)</div>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <NavLink href="/" label="Inicio" />
                <NavLink href="/suite" label="Suite" />
                <NavLink href="/bookings" label="Mis BookingNFT" />
                <NavLink href="/treasury" label="Treasury" />
                <NavLink href="/governance" label="Gobernanza" />
              </nav>
            </div>
          </Card>
          <h1 className="mt-4 text-2xl font-black tracking-tight">{title}</h1>
        </header>

        {children}
      </div>

      <div className="border-t border-slate-200 bg-white/60 py-4">
        <div className="mx-auto max-w-6xl px-4 text-xs text-slate-500">
          Tip: si MetaMask falla, revisa que Hardhat esté corriendo en http://127.0.0.1:8545.
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, label }) {
  return (
    <Link
      href={href}
      className={cx(
        'rounded-xl px-3 py-2',
        'hover:bg-slate-100',
        'text-slate-700'
      )}
    >
      {label}
    </Link>
  );
}
