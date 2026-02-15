function createHotelesRepo(db) {
  return {
    listByOwner({ owner_user_id }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hoteles WHERE owner_user_id=? ORDER BY id DESC', [owner_user_id], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    getById({ id }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hoteles WHERE id=? LIMIT 1', [id], (err, results) => {
          if (err) return reject(err);
          resolve((results && results[0]) || null);
        });
      });
    },

    getFirstByOwner({ owner_user_id }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM hoteles WHERE owner_user_id=? ORDER BY id ASC LIMIT 1', [owner_user_id], (err, results) => {
          if (err) return reject(err);
          resolve((results && results[0]) || null);
        });
      });
    },

    create({ owner_user_id, nombre, slug }) {
      return new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO hoteles (owner_user_id, nombre, slug) VALUES (?,?,?)',
          [owner_user_id, nombre, slug || null],
          (err, result) => {
            if (err) return reject(err);
            resolve({ id: result.insertId });
          }
        );
      });
    },

    updateById({ id, owner_user_id, patch }) {
      const fields = [];
      const vals = [];
      const allow = ['nombre','slug','pais','ciudad','direccion','descripcion','telefono','email','wallet','estado'];
      for (const k of allow) {
        if (patch[k] === undefined) continue;
        fields.push(`${k}=?`);
        vals.push(patch[k]);
      }
      return new Promise((resolve, reject) => {
        if (!fields.length) return resolve({ affectedRows: 0 });
        vals.push(id, owner_user_id);
        db.query(`UPDATE hoteles SET ${fields.join(', ')} WHERE id=? AND owner_user_id=?`, vals, (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows || 0 });
        });
      });
    },
  };
}

module.exports = { createHotelesRepo };
