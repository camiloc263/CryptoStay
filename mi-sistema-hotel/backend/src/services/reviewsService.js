function createReviewsService({ reviewsRepo }){
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  return {
    async addReview({ habitacion_numero, user_id, reserva_id = null, rating, comment = null }){
      if (!habitacion_numero) {
        const err = new Error('habitacion_numero requerido');
        err.status = 400;
        throw err;
      }
      if (!user_id) {
        const err = new Error('Debes iniciar sesión');
        err.status = 401;
        throw err;
      }
      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        const err = new Error('rating debe ser un número entre 1 y 5');
        err.status = 400;
        throw err;
      }
      const clean = (comment == null) ? null : String(comment).trim();
      const safe = clean ? clean.slice(0, 1000) : null;

      const out = await reviewsRepo.create({
        habitacion_numero: String(habitacion_numero),
        user_id: Number(user_id),
        reserva_id: reserva_id ? Number(reserva_id) : null,
        rating: clamp(r, 1, 5),
        comment: safe,
      });
      return out;
    },

    async listRoomReviews({ habitacion_numero, limit }){
      return reviewsRepo.listByRoom({ habitacion_numero: String(habitacion_numero), limit: Number(limit || 20) });
    },

    async getRoomSummary({ habitacion_numero }){
      return reviewsRepo.summaryByRoom({ habitacion_numero: String(habitacion_numero) });
    }
  };
}

module.exports = { createReviewsService };
