const express = require('express');

function createApiRoutes({
  authController,
  reservasController,
  habitacionesController,
  habitacionFotosController,
  hotelesController,
  ratesController,
  web3Controller,
  chatbotController,
  meController,
  reviewsController,
  preferencesController,
  eventsController,
  recommendationsController,
}) {
  const r = express.Router();

  // auth
  r.post('/login', authController.login);
  r.post('/register', authController.register);

  // me (session-scoped)
  r.get('/me', meController.me);
  r.get('/me/reservas', meController.myReservas);
  r.post('/wallets/link', meController.linkWallet);

  // preferences (AI-lite)
  r.get('/me/preferences', preferencesController.getMine);
  r.post('/me/preferences', preferencesController.setMine);
  r.post('/me/preferences/merge', preferencesController.mergeMine);

  // events (behavioral signals)
  r.post('/events', eventsController.add);

  // recommendations
  r.get('/recommendations', recommendationsController.get);

  // chatbot
  r.post('/chat', chatbotController.chat);

  // reservas
  r.post('/reservas', reservasController.createLegacy);
  r.post('/reservas/pending', reservasController.createPending);
  r.post('/reservas/confirmar-pago', reservasController.confirmarPago);
  r.post('/reservas/cancelar', reservasController.cancelar);
  r.get('/reservas/pendiente/:habitacion', reservasController.getPendientePorHabitacion);
  r.get('/reservas/:id', reservasController.getById);
  r.get('/reservas', reservasController.listLatest);

  // hoteles
  r.get('/hoteles', hotelesController.listMine);
  r.post('/hoteles', hotelesController.create);
  r.put('/hoteles/:id', hotelesController.updateMine);

  // habitaciones
  r.get('/habitaciones', habitacionesController.list);
  r.post('/habitaciones/crear', habitacionesController.crear);
  r.get('/hoteles/:hotelId/habitaciones', habitacionesController.listByHotel);
  r.post('/hoteles/:hotelId/habitaciones', habitacionesController.crearEnHotel);
  r.delete('/habitaciones/:id', habitacionesController.eliminar);
  r.put('/habitaciones/:id', habitacionesController.editar);
  r.post('/habitaciones/:numero/destacado', habitacionesController.destacado);
  r.post('/habitaciones/:numero/fotos', ...habitacionFotosController.uploadFotos);

  // estado
  r.post('/liberar', habitacionesController.liberar);
  r.post('/ocupar', habitacionesController.ocupar);
  r.post('/limpiar', habitacionesController.limpiar);
  r.post('/a-limpieza', habitacionesController.aLimpieza);

  // web3
  r.get('/web3/config', web3Controller.config);

  // reviews
  r.get('/habitaciones/:numero/reviews', reviewsController.listByRoom);
  r.get('/habitaciones/:numero/reviews/summary', reviewsController.summaryByRoom);
  r.post('/habitaciones/:numero/reviews', reviewsController.add);

  // rates
  r.get('/rates', ratesController.get);

  return r;
}

module.exports = { createApiRoutes };
