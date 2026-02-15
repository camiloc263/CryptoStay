const { ethers } = require('ethers');

function createReservasService({ reservasRepo }) {
  return {
    async createPending({ habitacion_numero, wallet, monto_eth, user_id }) {
      if (!habitacion_numero) {
        const err = new Error('habitacion_numero (o habitacion) es requerido');
        err.status = 400;
        throw err;
      }

      // compute expected amounts in native units (string integer)
      let expected_amount_wei = null;
      let expected_amount_usdc = null;
      try {
        const n = Number(String(monto_eth || '').replace(',', '.'));
        if (Number.isFinite(n) && n > 0) {
          expected_amount_wei = ethers.parseEther(String(n)).toString();
          expected_amount_usdc = ethers.parseUnits(String(n), 6).toString();
        }
      } catch {}

      const { id } = await reservasRepo.createPending({
        habitacion_numero,
        wallet,
        monto_eth,
        expected_amount_wei,
        expected_amount_usdc,
        user_id
      });
      return { reservaId: id, estado_pago: 'pendiente' };
    },

    async cancelar({ reservaId }) {
      if (!reservaId) {
        const err = new Error('reservaId es requerido');
        err.status = 400;
        throw err;
      }
      const r = await reservasRepo.cancelar({ reservaId });
      if (!r.affectedRows) {
        const err = new Error('Reserva no encontrada');
        err.status = 404;
        throw err;
      }
      return { reservaId, estado_reserva: 'cancelada' };
    },

    async getPendientePorHabitacion({ habitacion }) {
      const r = await reservasRepo.getPendientePorHabitacion({ habitacion });
      if (!r) {
        const err = new Error('No hay reserva pendiente para esta habitación');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async getById({ id }) {
      const r = await reservasRepo.getById({ id });
      if (!r) {
        const err = new Error('Reserva no encontrada');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async listLatest() {
      return reservasRepo.listLatest({ limit: 200 });
    },

    async listMine({ user_id, only, wallets }) {
      if (!user_id) {
        const err = new Error('user_id requerido');
        err.status = 400;
        throw err;
      }

      const rows = await reservasRepo.listByUser({ user_id, only, limit: 200 });
      if (rows && rows.length) return rows;

      // Fallback for older reservas without user_id: try matching by linked wallets
      if (wallets && wallets.length) {
        return reservasRepo.listByWallets({ wallets, only, limit: 200 });
      }

      return rows;
    }
  };
}

module.exports = { createReservasService };
