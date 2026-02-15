import { buybackAddress, treasuryAddress, governorAddress } from '../../config';

// Generic log fetch + parse helper
async function fetchAndParse({ provider, contract, address, fromBlock, toBlock, eventNames }) {
  const topics = (eventNames || []).map((n) => contract.interface.getEvent(n).topicHash);
  const logs = await provider.getLogs({ address, fromBlock, toBlock, topics: [topics] });
  const parsed = [];
  for (const log of logs) {
    try {
      const p = contract.interface.parseLog(log);
      parsed.push({
        name: p.name,
        args: p.args,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    } catch {
      // ignore
    }
  }
  parsed.sort((a, b) => b.blockNumber - a.blockNumber);
  return parsed;
}

export async function getRecentTreasuryEvents({ provider, contracts, lookbackBlocks = 2000 }) {
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - Number(lookbackBlocks || 2000));

  const events = await fetchAndParse({
    provider,
    contract: contracts.treasury,
    address: treasuryAddress,
    fromBlock,
    toBlock: latest,
    eventNames: ['RevenueReceived', 'Distributed', 'SplitUpdated'],
  });

  return { fromBlock, toBlock: latest, events };
}

export async function getRecentBuybackEvents({ provider, contracts, lookbackBlocks = 2000 }) {
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - Number(lookbackBlocks || 2000));

  const events = await fetchAndParse({
    provider,
    contract: contracts.buyback,
    address: buybackAddress,
    fromBlock,
    toBlock: latest,
    eventNames: ['Funded', 'PriceUpdated', 'BoughtBackAndBurned'],
  });

  return { fromBlock, toBlock: latest, events };
}

export async function getRecentGovernanceEvents({ provider, contracts, lookbackBlocks = 4000 }) {
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - Number(lookbackBlocks || 4000));

  const events = await fetchAndParse({
    provider,
    contract: contracts.governor,
    address: governorAddress,
    fromBlock,
    toBlock: latest,
    eventNames: ['ProposalCreated', 'VoteCast', 'ProposalQueued', 'ProposalExecuted'],
  });

  return { fromBlock, toBlock: latest, events };
}

export function shortHash(h) {
  if (!h) return '';
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

export function shortAddr(a) {
  if (!a) return '';
  const s = String(a);
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
