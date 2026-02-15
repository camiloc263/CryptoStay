import { ethers } from 'ethers';
import { treasuryAddress } from '../../config';

export function stateLabel(code) {
  const map = {
    0: 'Pending',
    1: 'Active',
    2: 'Canceled',
    3: 'Defeated',
    4: 'Succeeded',
    5: 'Queued',
    6: 'Expired',
    7: 'Executed',
  };
  return map[Number(code)] ?? String(code);
}

export async function getGovSnapshot({ provider, contracts, account, proposalId }) {
  const c = contracts;
  const [bal, nowBlock] = await Promise.all([
    c.gov.balanceOf(account),
    provider.getBlockNumber(),
  ]);

  const [v, q] = await Promise.all([
    c.governor.getVotes(account, nowBlock),
    c.governor.quorum(nowBlock),
  ]);

  let state = null;
  if (proposalId) {
    try {
      const st = await c.governor.state(proposalId);
      state = { code: Number(st), label: stateLabel(st) };
    } catch {
      state = null;
    }
  }

  return {
    govBalance: ethers.formatUnits(bal, 18),
    votes: {
      current: ethers.formatUnits(v, 18),
      quorum: ethers.formatUnits(q, 18),
    },
    state,
    nowBlock,
  };
}

export function buildSetSplitProposal({ treasuryContract, hotelBps, staffBps, buybackBps, description }) {
  const hb = Number(hotelBps);
  const sb = Number(staffBps);
  const bb = Number(buybackBps);
  if (hb + sb + bb !== 10000) throw new Error('La suma debe ser 10000 bps');

  const iface = new ethers.Interface(treasuryContract.interface.fragments);
  const calldata = iface.encodeFunctionData('setSplit', [hb, sb, bb]);

  const desc = description || `Actualizar split Treasury a Hotel ${hb} / Staff ${sb} / Buyback ${bb} (bps)`;
  const descHash = ethers.keccak256(ethers.toUtf8Bytes(desc));

  return {
    targets: [treasuryAddress],
    values: [0],
    calldatas: [calldata],
    desc,
    descHash,
  };
}

export async function propose({ contracts, proposal }) {
  const tx = await contracts.governor.propose(proposal.targets, proposal.values, proposal.calldatas, proposal.desc);
  const receipt = await tx.wait();

  // parse ProposalCreated
  let pid = '';
  for (const log of (receipt.logs || [])) {
    try {
      const parsed = contracts.governor.interface.parseLog(log);
      if (parsed?.name === 'ProposalCreated') {
        pid = String(parsed.args.proposalId);
        break;
      }
    } catch {}
  }
  return pid;
}

export async function castVote({ contracts, proposalId, support }) {
  const tx = await contracts.governor.castVote(proposalId, support);
  await tx.wait();
}

export async function delegateToSelf({ contracts, account }) {
  const tx = await contracts.gov.delegate(account);
  await tx.wait();
}

export async function queue({ contracts, proposal }) {
  const tx = await contracts.governor.queue(proposal.targets, proposal.values, proposal.calldatas, proposal.descHash);
  await tx.wait();
}

export async function execute({ contracts, proposal }) {
  const tx = await contracts.governor.execute(proposal.targets, proposal.values, proposal.calldatas, proposal.descHash);
  await tx.wait();
}

export async function mineBlocks({ provider, n }) {
  const count = Math.max(1, Number(n || 1));
  for (let i = 0; i < count; i++) {
    await provider.send('evm_mine', []);
  }
}
