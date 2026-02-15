function createReviewsRepo(db){
  return {
    create({ habitacion_numero, user_id = null, reserva_id = null, rating, comment = null }){
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO habitacion_reviews (habitacion_numero, user_id, reserva_id, rating, comment)
                     VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [habitacion_numero, user_id, reserva_id, rating, comment], (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId });
        });
      });
    },

    listByRoom({ habitacion_numero, limit = 20 }){
      return new Promise((resolve, reject) => {
        const sql = `SELECT id, habitacion_numero, user_id, reserva_id, rating, comment, created_at
                     FROM habitacion_reviews
                     WHERE habitacion_numero=?
                     ORDER BY id DESC
                     LIMIT ${Number(limit)}`;
        db.query(sql, [habitacion_numero], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    summaryByRoom({ habitacion_numero }){
      return new Promise((resolve, reject) => {
        const sql = `SELECT COUNT(*) as reviews, AVG(rating) as rating
                     FROM habitacion_reviews
                     WHERE habitacion_numero=?`;
        db.query(sql, [habitacion_numero], (err, results) => {
          if (err) return reject(err);
          const row = (results && results[0]) || { reviews: 0, rating: null };
          resolve({
            reviews: Number(row.reviews || 0),
            rating: row.rating === null ? null : Number(row.rating),
          });
        });
      });
    },
  };
}

module.exports = { createReviewsRepo };
