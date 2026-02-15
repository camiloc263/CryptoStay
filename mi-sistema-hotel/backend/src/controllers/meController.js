const { wrap } = require('./wrap');

function createMeController({ userWalletsService, reservasService }) {
  return {
    me: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const wallets = await userWalletsService.listMine({ user_id: Number(req.user.id) });
      res.json({ user: req.user, wallets });
    }),

    myReservas: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const only = String(req.query.only || '').toLowerCase();
      const walletsRows = await userWalletsService.listMine({ user_id: Number(req.user.id) });
      const wallets = (walletsRows || []).map(w => w.wallet);
      const rows = await reservasService.listMine({ user_id: Number(req.user.id), only, wallets });
      res.json(rows);
    }),

    linkWallet: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const { wallet } = req.body;
      const out = await userWalletsService.linkMine({ user_id: Number(req.user.id), wallet });
      res.json({ mensaje: 'OK', ...out });
    })
  };
}

module.exports = { createMeController };
