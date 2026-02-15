const { ethers } = require('ethers');

function createPaymentService({ reservasRepo, web3ConfigService }) {
  const validateTxHash = (txHash) => /^0x([0-9a-fA-F]{64})$/.test(String(txHash || ''));

  const RPC_URL = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';

  async function verifyOnchain({ reservaId, txHash, metodo, reserva }) {
    const cfg = web3ConfigService?.getConfig?.() || {};
    const hotelAddr = (cfg.hotelV2Address || cfg.hotelAddress || '').toLowerCase();
    const abi = cfg.hotelV2ABI || cfg.hotelABI;
    if (!hotelAddr || !abi) {
      const err = new Error('Config Web3 incompleta en backend');
      err.status = 500;
      throw err;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      const err = new Error('Tx no encontrada en red');
      err.status = 400;
      throw err;
    }
    if (receipt.status !== 1) {
      const err = new Error('Tx revertida');
      err.status = 400;
      throw err;
    }

    // must be sent to the HotelV2 contract
    if (String(receipt.to || '').toLowerCase() !== hotelAddr) {
      const err = new Error('Tx no corresponde al contrato del hotel');
      err.status = 400;
      throw err;
    }

    const iface = new ethers.Interface(abi);

    let matched = null;
    for (const log of (receipt.logs || [])) {
      if (String(log.address || '').toLowerCase() !== hotelAddr) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (!parsed) continue;
        if (parsed.name === 'ReservaPagada' || parsed.name === 'ReservaPagadaUSDC') {
          if (String(parsed.args?.reservaId) === String(reservaId)) {
            matched = parsed;
            break;
          }
        }
      } catch {
        // ignore non-matching logs
      }
    }

    if (!matched) {
      const err = new Error('No se encontró evento de pago para esa reserva en la tx');
      err.status = 400;
      throw err;
    }

    const payer = String(matched.args?.payer || '').toLowerCase();
    const expectedWallet = String(reserva?.wallet || '').toLowerCase();
    if (expectedWallet && payer && expectedWallet !== payer) {
      const err = new Error('El wallet que pagó no coincide con la reserva');
      err.status = 400;
      throw err;
    }

    const m = String(metodo || '').toUpperCase().trim();
    if (m === 'USDC' || matched.name === 'ReservaPagadaUSDC') {
      const token = String(matched.args?.token || '').toLowerCase();
      const usdcAddr = String(cfg.usdcAddress || '').toLowerCase();
      if (usdcAddr && token && token !== usdcAddr) {
        const err = new Error('Token de pago inválido');
        err.status = 400;
        throw err;
      }

      const amount = matched.args?.amount;
      if (!amount || amount <= 0n) {
        const err = new Error('Monto USDC inválido');
        err.status = 400;
        throw err;
      }

      // compare with expected amount (usdc base units) stored in DB (>=)
      try {
        const expStr = reserva?.expected_amount_usdc;
        const exp = expStr ? BigInt(String(expStr)) : null;
        if (exp && amount < exp) {
          const err = new Error('Monto USDC on-chain menor al esperado');
          err.status = 400;
          throw err;
        }
      } catch {}
    } else {
      // ETH
      const amountWei = matched.args?.amountWei;
      if (!amountWei || amountWei <= 0n) {
        const err = new Error('Monto ETH inválido');
        err.status = 400;
        throw err;
      }

      // compare with expected amount (wei) stored in DB (>=)
      try {
        const expStr = reserva?.expected_amount_wei;
        const exp = expStr ? BigInt(String(expStr)) : (reserva?.monto_eth ? ethers.parseEther(String(reserva.monto_eth)) : null);
        if (exp && amountWei < exp) {
          const err = new Error('Monto on-chain menor al esperado');
          err.status = 400;
          throw err;
        }
      } catch {}
    }

    return { ok: true };
  }

  return {
    async confirmarPago({ reservaId, txHash, metodo }) {
      if (!reservaId || !txHash) {
        const err = new Error('reservaId y txHash son requeridos');
        err.status = 400;
        throw err;
      }

      if (!validateTxHash(txHash)) {
        const err = new Error('txHash inválido');
        err.status = 400;
        throw err;
      }

      // prevent tx reuse
      const already = await reservasRepo.findByTxHash({ txHash });
      if (already) {
        const err = new Error('txHash ya fue usado');
        err.status = 409;
        throw err;
      }

      const current = await reservasRepo.getById({ id: reservaId });
      if (!current) {
        const err = new Error('Reserva no encontrada');
        err.status = 404;
        throw err;
      }

      if (String(current.estado_pago || '').toLowerCase() !== 'pendiente') {
        const err = new Error('Reserva ya pagada');
        err.status = 409;
        throw err;
      }

      await verifyOnchain({ reservaId, txHash, metodo, reserva: current });

      const r = await reservasRepo.confirmPago({ reservaId, txHash });
      if (!r.affectedRows) {
        const err = new Error('Reserva no encontrada');
        err.status = 404;
        throw err;
      }

      return { reservaId, estado_pago: 'pagada' };
    }
  };
}

module.exports = { createPaymentService };

