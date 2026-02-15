import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Button, Card, Input, Pill } from '../components/ui';
import { connectWallet, shortAddr } from '../lib/web3';
import { treasuryAddress } from '../config';
import {
  buildSetSplitProposal,
  castVote,
  delegateToSelf,
  execute,
  getGovSnapshot,
  mineBlocks,
  propose,
  queue,
  stateLabel,
} from '../lib/services/governanceService';
import {
  getRecentGovernanceEvents,
  shortHash as evShortHash,
} from '../lib/services/eventsService';

export default function GovernancePage() {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);

  const [govBal, setGovBal] = useState('0');

  // proposal form: change split
  const [hotelBps, setHotelBps] = useState('6000');
  const [staffBps, setStaffBps] = useState('3000');
  const [buybackBps, setBuybackBps] = useState('1000');

  const [proposalId, setProposalId] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');

  const [votes, setVotes] = useState({ current: '0', quorum: '0' });
  const [stateInfo, setStateInfo] = useState({ code: null, label: 'â€”' });
  const [mineBlocksN, setMineBlocksN] = useState('5');

  const [eventsLookback, setEventsLookback] = useState('4000');
  const [govEvents, setGovEvents] = useState([]);

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

  async function refresh() {
    if (!c || !account || !provider) return;
    setErr(null);
    try {
      const snap = await getGovSnapshot({ provider, contracts: c, account, proposalId });
      setGovBal(snap.govBalance);
      setVotes(snap.votes);
      if (snap.state) setStateInfo(snap.state);
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo leer GovToken');
    }
  }

  async function refreshEvents() {
    if (!provider || !c) return;
    try {
      const lookback = Number(eventsLookback || 4000);
      const out = await getRecentGovernanceEvents({ provider, contracts: c, lookbackBlocks: lookback });
      setGovEvents((out.events || []).slice(0, 14));
    } catch {}
  }

  useEffect(() => {
    refresh();
    refreshEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, account]);

  async function proposeSplitChange() {
    if (!c) return;
    setLoading(true);
    setErr(null);
    try {
      const proposal = buildSetSplitProposal({
        treasuryContract: c.treasury,
        hotelBps,
        staffBps,
        buybackBps,
        description: proposalDesc,
      });
      setProposalDesc(proposal.desc);
      const pid = await propose({ contracts: c, proposal });
      setProposalId(pid || '');
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo proponer');
    }
    setLoading(false);
  }

  async function getState(silent = false) {
    if (!c || !proposalId) return;
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const st = await c.governor.state(proposalId);
      const label = stateLabel(st);
      setStateInfo({ code: Number(st), label });
      if (!silent) alert(`Estado: ${label} (${Number(st)})`);
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo leer estado');
    }
    if (!silent) setLoading(false);
  }

  async function onVote(support) {
    if (!c || !proposalId) return;
    setLoading(true);
    setErr(null);
    try {
      await castVote({ contracts: c, proposalId, support });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo votar');
    }
    setLoading(false);
  }

  async function onDelegate() {
    if (!c || !account) return;
    setLoading(true);
    setErr(null);
    try {
      await delegateToSelf({ contracts: c, account });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo delegar');
    }
    setLoading(false);
  }

  function buildProposalCall(){
    return buildSetSplitProposal({
      treasuryContract: c.treasury,
      hotelBps,
      staffBps,
      buybackBps,
      description: proposalDesc,
    });
  }

  async function queueProposal(){
    if (!c || !proposalId) return;
    setLoading(true);
    setErr(null);
    try {
      const proposal = buildProposalCall();
      await queue({ contracts: c, proposal });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo hacer queue');
    }
    setLoading(false);
  }

  async function executeProposal(){
    if (!c || !proposalId) return;
    setLoading(true);
    setErr(null);
    try {
      const proposal = buildProposalCall();
      await execute({ contracts: c, proposal });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr(e?.reason || e?.message || 'No se pudo ejecutar');
    }
    setLoading(false);
  }

  async function onMineBlocks(){
    if (!provider) return;
    setLoading(true);
    setErr(null);
    try {
      await mineBlocks({ provider, n: mineBlocksN });
      await refresh();
      await refreshEvents();
    } catch (e) {
      setErr('No se pudo minar bloques (solo funciona en Hardhat local)');
    }
    setLoading(false);
  }

  return (
    <Layout title="Gobernanza â€¢ propuesta â†’ voto â†’ queue â†’ execute">
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
            <div className="font-extrabold">GovToken</div>
            <Pill tone="blue">ERC20Votes</Pill>
          </div>
          <div className="text-sm text-slate-600">Balance: <b>{Number(govBal).toFixed(2)}</b></div>
          <div className="text-sm text-slate-600">Votos (delegados): <b>{Number(votes.current).toFixed(2)}</b></div>
          <div className="text-sm text-slate-600">Quorum (aprox): <b>{Number(votes.quorum).toFixed(2)}</b></div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={onDelegate} disabled={!account || loading}>Delegar a mÃ­</Button>
            <Pill tone={Number(votes.current) > 0 ? 'green' : 'yellow'}>
              {Number(votes.current) > 0 ? 'Listo para votar' : 'Falta delegaciÃ³n'}
            </Pill>
          </div>

          <div className="mt-2 text-xs text-slate-500">Tip: En ERC20Votes, necesitas delegarte para que el balance cuente como votos.</div>
        </Card>

        <Card className="p-4 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-extrabold">Proponer cambio de split (Treasury.setSplit)</div>
            <Pill tone="yellow">Timelock</Pill>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <div className="text-xs font-extrabold text-slate-600">Hotel (bps)</div>
              <Input value={hotelBps} onChange={(e) => setHotelBps(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-600">Staff (bps)</div>
              <Input value={staffBps} onChange={(e) => setStaffBps(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-600">Buyback (bps)</div>
              <Input value={buybackBps} onChange={(e) => setBuybackBps(e.target.value)} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={proposeSplitChange} disabled={!account || loading}>Crear propuesta</Button>
            <div className="text-xs text-slate-500">La suma debe ser 10000.</div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-extrabold text-slate-600">ProposalId</div>
            <Input value={proposalId} onChange={(e) => setProposalId(e.target.value)} placeholder="Pega el proposalId aquÃ­" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={getState} disabled={!proposalId || loading}>Estado</Button>
              <Button onClick={() => onVote(1)} disabled={!proposalId || loading}>Votar SÃ­</Button>
              <Button variant="danger" onClick={() => onVote(0)} disabled={!proposalId || loading}>Votar No</Button>
              <Button onClick={queueProposal} disabled={!proposalId || loading}>Queue</Button>
              <Button onClick={executeProposal} disabled={!proposalId || loading}>Execute</Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-xs font-extrabold text-slate-600">Estado actual:</div>
              <Pill tone={stateInfo.label==='Succeeded' ? 'green' : (stateInfo.label==='Queued' ? 'yellow' : 'gray')}>{stateInfo.label}</Pill>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div className="text-xs font-extrabold text-slate-600">Demo: minar bloques</div>
              <Input value={mineBlocksN} onChange={(e) => setMineBlocksN(e.target.value)} className="max-w-[120px]" />
              <Button variant="ghost" onClick={onMineBlocks} disabled={!account || loading}>Minar</Button>
              <div className="text-xs text-slate-500">(para pasar de Pendingâ†’Active y terminar votaciÃ³n rÃ¡pido)</div>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Nota: Para Queue necesitas estado <b>Succeeded</b>. Para Execute necesitas <b>Queued</b> y que pase el timelock.
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-extrabold">Eventos recientes (Governor)</div>
            <div className="text-xs text-slate-500">ProposalCreated / VoteCast / Queued / Executed</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600">Lookback</div>
            <Input value={eventsLookback} onChange={(e)=>setEventsLookback(e.target.value)} className="max-w-[120px]" />
            <Button variant="ghost" onClick={refreshEvents} disabled={!account || loading}>Refrescar eventos</Button>
          </div>
        </div>

        {govEvents.length === 0 ? (
          <div className="text-sm text-slate-600">Sin eventos recientes.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {govEvents.map((ev, idx) => (
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
      </Card>
    </Layout>
  );
}

