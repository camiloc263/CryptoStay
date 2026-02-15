import { ethers } from 'ethers';
import { hotelV2Address, usdcAddress } from '../../config';

// Small in-memory cache to reduce repeated Web2 calls in one session
const _reservaCache = new Map();

export function isEth(addr) {
  return !addr || addr === ethers.ZeroAddress;
}

export function isUsdc(addr) {
  return String(addr || '').toLowerCase() === String(usdcAddress).toLowerCase();
}

export function formatAmount(paidToken, amount) {
  try {
    if (amount == null) return '—';
    if (typeof amount === 'bigint') {
      if (isEth(paidToken)) return `${Number(ethers.formatEther(amount)).toFixed(6)} ETH`;
      if (isUsdc(paidToken)) return `${Number(ethers.formatUnits(amount, 6)).toFixed(2)} USDC`;
      return amount.toString();
    }
    return String(amount);
  } catch {
    return String(amount || '—');
  }
}

export function formatDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  try {
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const fmt = (d) => d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
    return `${fmt(a)} → ${fmt(b)}`;
  } catch {
    return `${checkIn} → ${checkOut}`;
  }
}

export function shortHash(h) {
  if (!h) return '';
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

export async function scanOwnedBookings({ booking, account, scanLimit = 50 }) {
  const nextId = await booking.nextId();
  const max = Math.max(0, Number(nextId) - 1);
  const limit = Math.max(1, Number(scanLimit || 50));
  const start = Math.max(1, max - limit + 1);

  const owned = [];
  for (let tokenId = start; tokenId <= max; tokenId++) {
    try {
      const owner = await booking.ownerOf(tokenId);
      if (owner.toLowerCase() !== account.toLowerCase()) continue;
      const meta = await booking.bookingByTokenId(tokenId);
      owned.push({ tokenId, meta, reservaId: Number(meta.reservaId) });
    } catch {
      // skip
    }
  }
  owned.sort((a, b) => (b.reservaId - a.reservaId));
  return owned;
}

export async function fetchReserva({ web2Api, reservaId }) {
  if (!web2Api) return null;
  const k = String(reservaId);
  if (_reservaCache.has(k)) return _reservaCache.get(k);
  try {
    const r = await fetch(`${web2Api}/reservas/${reservaId}`);
    if (!r.ok) return null;
    const data = await r.json();
    _reservaCache.set(k, data);
    return data;
  } catch {
    return null;
  }
}

export async function findTxHashForReserva({ provider, hotelV2, reservaId, lookbackBlocks = 5000 }) {
  try {
    if (!provider || !hotelV2) return null;

    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - Number(lookbackBlocks || 5000));

    const topics = [
      hotelV2.interface.getEvent('ReservaPagada').topicHash,
      hotelV2.interface.getEvent('ReservaPagadaUSDC').topicHash,
    ];

    const logs = await provider.getLogs({
      address: hotelV2Address,
      fromBlock,
      toBlock: latest,
      topics: [topics],
    });

    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      try {
        const parsed = hotelV2.interface.parseLog(log);
        if (Number(parsed?.args?.reservaId) === Number(reservaId)) {
          return log.transactionHash;
        }
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

export async function enrichBookings({ items, provider, hotelV2, web2Api, lookbackBlocks }) {
  return Promise.all(
    (items || []).map(async (it) => {
      const [web2, txHash] = await Promise.all([
        fetchReserva({ web2Api, reservaId: it.reservaId }),
        findTxHashForReserva({ provider, hotelV2, reservaId: it.reservaId, lookbackBlocks }),
      ]);
      return { ...it, web2, txHash };
    })
  );
}
