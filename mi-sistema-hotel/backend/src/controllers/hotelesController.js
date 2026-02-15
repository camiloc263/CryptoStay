const { wrap } = require('./wrap');

function createHotelesController({ hotelesService }) {
  return {
    listMine: wrap(async (req, res) => {
      const owner_user_id = Number(req.user?.id || req.query.owner_user_id);
      const rows = await hotelesService.listMine({ owner_user_id });
      res.json(rows);
    }),

    create: wrap(async (req, res) => {
      const owner_user_id = Number(req.user?.id || req.body.owner_user_id);
      const { nombre, slug } = req.body;
      const r = await hotelesService.create({ owner_user_id, nombre, slug });
      res.json({ mensaje: 'Hotel creado', ...r });
    }),

    updateMine: wrap(async (req, res) => {
      const id = Number(req.params.id);
      const owner_user_id = Number(req.user?.id || req.body.owner_user_id);
      const patch = { ...req.body };
      delete patch.owner_user_id;
      const r = await hotelesService.updateMine({ owner_user_id, id, patch });
      res.json({ mensaje: 'Hotel actualizado', ...r });
    })
  };
}

module.exports = { createHotelesController };
