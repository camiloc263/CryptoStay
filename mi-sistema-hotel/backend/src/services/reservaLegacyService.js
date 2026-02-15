function createReservaLegacyService({ reservasRepo, habitacionesRepo }) {
  const nightsBetween = (check_in, check_out) => {
    const a = new Date(check_in);
    const b = new Date(check_out);
    const ms = b.getTime() - a.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  return {
    async create({ nombre, habitacion, check_in, check_out, user_id = null, wallet = null }) {
      // Legacy endpoint used by admin panel (creates reserva + sets room to ocupada)
      const habitacion_numero = habitacion;

      if (!nombre || !habitacion_numero || !check_in || !check_out) {
        const err = new Error('nombre, habitacion, check_in y check_out son requeridos');
        err.status = 400;
        throw err;
      }

      const noches = nightsBetween(check_in, check_out);
      if (!Number.isFinite(noches) || noches <= 0) {
        const err = new Error('check_out debe ser mayor que check_in');
        err.status = 400;
        throw err;
      }

      const { id } = await reservasRepo.createLegacy({ habitacion_numero, check_in, check_out, noches, user_id, wallet });

      if (habitacionesRepo) {
        await habitacionesRepo.setEstado({ numero: habitacion_numero, estado: 'ocupada' });
      }

      return { reservaId: id, estado_pago: 'pendiente' };
    }
  };
}

module.exports = { createReservaLegacyService };
