import Layout from '../components/Layout';
import { Card, Pill } from '../components/ui';

export default function Suite() {
  return (
    <Layout title="Suite de demostración (5 pilares)">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">1) Propiedad / participación</div>
            <Pill tone="blue">BookingNFT</Pill>
          </div>
          <div className="text-sm text-slate-600">
            Reserva verificable on-chain (SBT/receipt). Entra a <b>Mis BookingNFT</b>.
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">2) Incentivos programables</div>
            <Pill tone="green">RewardsToken</Pill>
          </div>
          <div className="text-sm text-slate-600">
            Recompensas ERC20 minteadas por pagar. (Se mostrará balance en panel de Treasury/Gob.)
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">3) Ingresos + recompras</div>
            <Pill tone="yellow">Treasury 60/30/10</Pill>
          </div>
          <div className="text-sm text-slate-600">
            Balances, split y acciones de distribución (ETH/USDC) desde <b>Treasury</b>.
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">4) Gobernanza creíble</div>
            <Pill tone="gray">Governor + Timelock</Pill>
          </div>
          <div className="text-sm text-slate-600">
            Propuestas y votos para cambios (ej: split) desde <b>Gobernanza</b>.
          </div>
        </Card>

        <Card className="p-4 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-extrabold">5) Componibilidad</div>
            <Pill tone="blue">Standards</Pill>
          </div>
          <div className="text-sm text-slate-600">
            Todo es ERC20/ERC721/ERC20Votes/Timelock: integrable con otras apps. Aquí lo evidenciamos leyendo estados y eventos directamente del chain.
          </div>
        </Card>
      </div>
    </Layout>
  );
}
