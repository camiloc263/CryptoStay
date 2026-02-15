const { wrap } = require('./wrap');

function createHabitacionesController({ habitacionesService, hotelesService }) {
  return {
    list: wrap(async (req, res) => {
      // If a staff/owner session is available, return rooms across hotels owned by that user.
      // For guest-facing pages (e.g., payment), always allow listing all rooms.
      const role = String(req.user?.rol || req.headers['x-hs-role'] || '').toLowerCase();
      const isStaff = role === 'administrador' || role === 'gerente';

      if (req.user?.id && isStaff) {
        const rooms = await habitacionesService.listByOwnerWithFotos({ owner_user_id: Number(req.user.id) });
        return res.json(rooms);
      }

      const rooms = await habitacionesService.listAllWithFotos();
      res.json(rooms);
    }),

    listByHotel: wrap(async (req, res) => {
      const hotel_id = Number(req.params.hotelId);
      const owner_user_id = Number(req.user?.id);
      await hotelesService.assertOwned({ owner_user_id, hotel_id });
      const rooms = await habitacionesService.listByHotelWithFotos({ hotel_id });
      res.json(rooms);
    }),

    crear: wrap(async (req, res) => {
      const { numero, tipo, precio_cop, hotel_id, descripcion } = req.body;

      let hid = Number(hotel_id || 0) || null;
      if (!hid && req.user?.id) {
        hid = await hotelesService.getDefaultHotelId({ owner_user_id: Number(req.user.id) });
      }

      await habitacionesService.create({ hotel_id: hid, numero, tipo, precio_cop, descripcion });
      res.json({ mensaje: 'Habitación creada exitosamente' });
    }),

    crearEnHotel: wrap(async (req, res) => {
      const hotel_id = Number(req.params.hotelId);
      const owner_user_id = Number(req.user?.id);
      await hotelesService.assertOwned({ owner_user_id, hotel_id });
      const { numero, tipo, precio_cop, descripcion } = req.body;
      await habitacionesService.create({ hotel_id, numero, tipo, precio_cop, descripcion });
      res.json({ mensaje: 'Habitación creada exitosamente', hotel_id });
    }),

    eliminar: wrap(async (req, res) => {
      const { id } = req.params;
      await habitacionesService.deleteById({ id });
      res.json({ mensaje: 'Habitación eliminada' });
    }),

    editar: wrap(async (req, res) => {
      const { id } = req.params;
      const { numero, tipo, precio_cop, descripcion } = req.body;
      await habitacionesService.updateById({ id, numero, tipo, precio_cop, descripcion });
      res.json({ mensaje: 'Habitación actualizada' });
    }),

    destacado: wrap(async (req, res) => {
      const { numero } = req.params;
      const { destacado } = req.body;
      await habitacionesService.setDestacado({ numero, destacado });
      res.json({ mensaje: 'OK', numero, destacado: !!destacado });
    }),

    liberar: wrap(async (req, res) => {
      const { habitacion } = req.body;
      await habitacionesService.setEstado({ numero: habitacion, estado: 'disponible' });
      res.json({ mensaje: 'Habitación liberada', habitacion });
    }),

    ocupar: wrap(async (req, res) => {
      const { habitacion } = req.body;
      await habitacionesService.setEstado({ numero: habitacion, estado: 'ocupada' });
      res.json({ mensaje: 'Habitación ocupada', habitacion });
    }),

    limpiar: wrap(async (req, res) => {
      const { habitacion } = req.body;
      await habitacionesService.setEstado({ numero: habitacion, estado: 'disponible' });
      res.json({ mensaje: 'Limpieza terminada', habitacion });
    }),

    aLimpieza: wrap(async (req, res) => {
      const { habitacion } = req.body;
      await habitacionesService.setEstado({ numero: habitacion, estado: 'limpieza' });
      res.json({ mensaje: 'Habitación a limpieza', habitacion });
    }),
  };
}

module.exports = { createHabitacionesController };
