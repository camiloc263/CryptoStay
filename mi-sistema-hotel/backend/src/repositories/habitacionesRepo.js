function createHabitacionesRepo(db) {
  return {
    listAll() {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM habitaciones', (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    listByOwner({ owner_user_id }) {
      return new Promise((resolve, reject) => {
        const sql = `
          SELECT h.*
          FROM habitaciones h
          JOIN hoteles ho ON ho.id = h.hotel_id
          WHERE ho.owner_user_id=?
          ORDER BY h.id DESC
        `;
        db.query(sql, [owner_user_id], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    listByHotel({ hotel_id }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM habitaciones WHERE hotel_id=? ORDER BY id DESC', [hotel_id], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    getByNumero({ numero }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM habitaciones WHERE numero=? LIMIT 1', [numero], (err, results) => {
          if (err) return reject(err);
          resolve((results && results[0]) || null);
        });
      });
    },

    create({ hotel_id, numero, tipo, precio_cop, descripcion }) {
      return new Promise((resolve, reject) => {
        const sql = "INSERT INTO habitaciones (hotel_id, numero, tipo, estado, precio_cop, descripcion) VALUES (?, ?, ?, 'disponible', ?, ?)";
        db.query(sql, [hotel_id, numero, tipo, Number(precio_cop || 0), descripcion || null], (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId });
        });
      });
    },

    deleteById({ id }) {
      return new Promise((resolve, reject) => {
        db.query('DELETE FROM habitaciones WHERE id = ?', [id], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    },

    updateById({ id, numero, tipo, precio_cop, descripcion }) {
      return new Promise((resolve, reject) => {
        const sql = 'UPDATE habitaciones SET numero = ?, tipo = ?, precio_cop = ?, descripcion = ? WHERE id = ?';
        db.query(sql, [numero, tipo, Number(precio_cop || 0), descripcion || null, id], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    },

    setDestacado({ numero, destacado }) {
      return new Promise((resolve, reject) => {
        const sql = 'UPDATE habitaciones SET destacado=? WHERE numero=?';
        db.query(sql, [destacado ? 1 : 0, numero], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    },

    setEstado({ numero, estado }) {
      return new Promise((resolve, reject) => {
        const sql = 'UPDATE habitaciones SET estado=? WHERE numero=?';
        db.query(sql, [estado, numero], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    }
  };
}

module.exports = { createHabitacionesRepo };
