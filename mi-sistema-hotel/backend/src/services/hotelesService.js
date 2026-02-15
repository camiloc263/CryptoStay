function createHotelesService({ hotelesRepo }) {
  return {
    async listMine({ owner_user_id }) {
      if (!owner_user_id) {
        const err = new Error('owner_user_id requerido');
        err.status = 400;
        throw err;
      }
      return hotelesRepo.listByOwner({ owner_user_id });
    },

    async create({ owner_user_id, nombre, slug }) {
      if (!owner_user_id || !nombre) {
        const err = new Error('owner_user_id y nombre son requeridos');
        err.status = 400;
        throw err;
      }
      return hotelesRepo.create({ owner_user_id, nombre, slug });
    },

    async updateMine({ owner_user_id, id, patch }) {
      const r = await hotelesRepo.updateById({ id, owner_user_id, patch });
      if (!r.affectedRows) {
        const err = new Error('Hotel no encontrado o sin permisos');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async getDefaultHotelId({ owner_user_id }) {
      const h = await hotelesRepo.getFirstByOwner({ owner_user_id });
      if (!h) {
        const err = new Error('No tienes hoteles creados');
        err.status = 404;
        throw err;
      }
      return Number(h.id);
    },

    async assertOwned({ owner_user_id, hotel_id }) {
      const h = await hotelesRepo.getById({ id: hotel_id });
      if (!h || Number(h.owner_user_id) !== Number(owner_user_id)) {
        const err = new Error('Hotel no encontrado o sin permisos');
        err.status = 403;
        throw err;
      }
      return h;
    }
  };
}

module.exports = { createHotelesService };
