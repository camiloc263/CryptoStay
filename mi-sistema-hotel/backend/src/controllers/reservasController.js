const { wrap } = require('./wrap');

function createReservasController({ reservasService, reservaLegacyService, paymentService, userWalletsService }) {
  return {
    createLegacy: wrap(async (req, res) => {
      const { nombre, habitacion, check_in, check_out, wallet } = req.body;
      const user_id = req.user?.id ? Number(req.user.id) : null;

      // If user is logged in and has linked wallets, prefer primary wallet
      let w = wallet || null;
      if (user_id && userWalletsService?.listMine) {
        try {
          const ws = await userWalletsService.listMine({ user_id });
          const primary = (ws || []).find(x => Number(x.is_primary) === 1) || (ws || [])[0];
          if (primary?.wallet) w = primary.wallet;
        } catch {}
      }

      const r = await reservaLegacyService.create({ nombre, habitacion, check_in, check_out, user_id, wallet: w });
      res.json({ mensaje: 'Reserva creada', ...r });
    }),

    createPending: wrap(async (req, res) => {
      const habitacion_numero = req.body.habitacion_numero ?? req.body.habitacion;
      const { wallet, monto_eth } = req.body;
      const user_id = req.user?.id ? Number(req.user.id) : null;
      const r = await reservasService.createPending({ habitacion_numero, wallet, monto_eth, user_id });
      res.json({ mensaje: 'Reserva creada', ...r });
    }),

    confirmarPago: wrap(async (req, res) => {
      const { reservaId, txHash, metodo } = req.body;
      const r = await paymentService.confirmarPago({ reservaId, txHash, metodo });
      res.json({ mensaje: 'Pago confirmado', ...r });
    }),

    cancelar: wrap(async (req, res) => {
      const { reservaId } = req.body;
      const r = await reservasService.cancelar({ reservaId });
      res.json({ mensaje: 'Reserva cancelada', ...r });
    }),

    getPendientePorHabitacion: wrap(async (req, res) => {
      const habitacion = req.params.habitacion;
      const r = await reservasService.getPendientePorHabitacion({ habitacion });
      res.json(r);
    }),

    getById: wrap(async (req, res) => {
      const id = req.params.id;
      const r = await reservasService.getById({ id });
      res.json(r);
    }),

    listLatest: wrap(async (_req, res) => {
      const rows = await reservasService.listLatest();
      res.json(rows);
    })
  };
}

module.exports = { createReservasController };
