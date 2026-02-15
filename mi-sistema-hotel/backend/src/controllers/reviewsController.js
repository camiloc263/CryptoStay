const { wrap } = require('./wrap');

function createReviewsController({ reviewsService }){
  return {
    add: wrap(async (req, res) => {
      const habitacion_numero = req.params.numero;
      const user_id = req.user?.id ? Number(req.user.id) : null;
      const { rating, comment, reserva_id } = req.body || {};
      const r = await reviewsService.addReview({ habitacion_numero, user_id, rating, comment, reserva_id });
      res.status(201).json({ mensaje: 'Review guardada', ...r });
    }),

    listByRoom: wrap(async (req, res) => {
      const habitacion_numero = req.params.numero;
      const limit = req.query.limit;
      const rows = await reviewsService.listRoomReviews({ habitacion_numero, limit });
      res.json(rows);
    }),

    summaryByRoom: wrap(async (req, res) => {
      const habitacion_numero = req.params.numero;
      const s = await reviewsService.getRoomSummary({ habitacion_numero });
      res.json(s);
    })
  };
}

module.exports = { createReviewsController };
