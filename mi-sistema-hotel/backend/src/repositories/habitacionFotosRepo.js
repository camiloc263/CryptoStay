function createHabitacionFotosRepo(db) {
  return {
    listByHabitacion({ habitacion_numero }) {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT * FROM habitacion_fotos WHERE habitacion_numero=? ORDER BY id ASC',
          [habitacion_numero],
          (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          }
        );
      });
    },

    insertMany({ habitacion_numero, urls }) {
      return new Promise((resolve, reject) => {
        if (!urls?.length) return resolve({ inserted: 0 });
        const values = urls.map((u) => [habitacion_numero, u]);
        db.query(
          'INSERT INTO habitacion_fotos (habitacion_numero, url) VALUES ?',
          [values],
          (err, result) => {
            if (err) return reject(err);
            resolve({ inserted: result.affectedRows || 0 });
          }
        );
      });
    },

    deleteByHabitacion({ habitacion_numero }) {
      return new Promise((resolve, reject) => {
        db.query('DELETE FROM habitacion_fotos WHERE habitacion_numero=?', [habitacion_numero], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows || 0 });
        });
      });
    }
  };
}

module.exports = { createHabitacionFotosRepo };
