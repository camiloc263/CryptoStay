function createHabitacionesService({ habitacionesRepo, fotosHabitaciones, habitacionFotosService }) {
  return {
    async listAllWithFotos() {
      const rooms = await habitacionesRepo.listAll();
      // Prefer DB photos; fallback to legacy map
      const out = [];
      for (const h of rooms) {
        let fotos = [];
        try {
          if (habitacionFotosService) {
            fotos = await habitacionFotosService.listUrls({ habitacion_numero: String(h.numero) });
          }
        } catch {}
        if (!fotos?.length) fotos = fotosHabitaciones[String(h.numero)] || [];
        out.push({ ...h, fotos });
      }
      return out;
    },

    async listByOwnerWithFotos({ owner_user_id }) {
      const rooms = await habitacionesRepo.listByOwner({ owner_user_id });
      const out = [];
      for (const h of rooms) {
        let fotos = [];
        try {
          if (habitacionFotosService) {
            fotos = await habitacionFotosService.listUrls({ habitacion_numero: String(h.numero) });
          }
        } catch {}
        if (!fotos?.length) fotos = fotosHabitaciones[String(h.numero)] || [];
        out.push({ ...h, fotos });
      }
      return out;
    },

    async listByHotelWithFotos({ hotel_id }) {
      const rooms = await habitacionesRepo.listByHotel({ hotel_id });
      const out = [];
      for (const h of rooms) {
        let fotos = [];
        try {
          if (habitacionFotosService) {
            fotos = await habitacionFotosService.listUrls({ habitacion_numero: String(h.numero) });
          }
        } catch {}
        if (!fotos?.length) fotos = fotosHabitaciones[String(h.numero)] || [];
        out.push({ ...h, fotos });
      }
      return out;
    },

    async create({ hotel_id, numero, tipo, precio_cop, descripcion }) {
      if (!hotel_id || !numero || !tipo) {
        const err = new Error('hotel_id, numero y tipo son requeridos');
        err.status = 400;
        throw err;
      }
      return habitacionesRepo.create({ hotel_id, numero, tipo, precio_cop, descripcion });
    },

    async deleteById({ id }) {
      const r = await habitacionesRepo.deleteById({ id });
      if (!r.affectedRows) {
        const err = new Error('Habitación no encontrada');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async updateById({ id, numero, tipo, precio_cop, descripcion }) {
      const r = await habitacionesRepo.updateById({ id, numero, tipo, precio_cop, descripcion });
      if (!r.affectedRows) {
        const err = new Error('Habitación no encontrada');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async setDestacado({ numero, destacado }) {
      const r = await habitacionesRepo.setDestacado({ numero, destacado });
      if (!r.affectedRows) {
        const err = new Error('Habitación no encontrada');
        err.status = 404;
        throw err;
      }
      return r;
    },

    async setEstado({ numero, estado }) {
      const r = await habitacionesRepo.setEstado({ numero, estado });
      if (!r.affectedRows) {
        const err = new Error('Habitación no encontrada');
        err.status = 404;
        throw err;
      }
      return r;
    }
  };
}

module.exports = { createHabitacionesService };
