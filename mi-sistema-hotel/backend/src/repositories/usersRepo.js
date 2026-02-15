function createUsersRepo(db) {
  function getColumns() {
    return new Promise((resolve, reject) => {
      db.query('SHOW COLUMNS FROM usuarios', (err, results) => {
        if (err) return reject(err);
        const cols = (results || []).map(r => String(r.Field));
        resolve(cols);
      });
    });
  }

  return {
    findByCredentials({ usuario, password }) {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM usuarios WHERE usuario = ? AND password = ?';
        db.query(sql, [usuario, password], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    findByUsuario({ usuario }) {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM usuarios WHERE usuario = ?';
        db.query(sql, [usuario], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    findByEmail({ email }) {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(sql, [email], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    async createUser({ usuario, password, rol, email, nombre, apellido }) {
      const cols = await getColumns();
      const has = (c) => cols.includes(c);

      // Build insert based on existing columns (keeps compatibility if schema is old)
      const fields = [];
      const values = [];

      fields.push('usuario'); values.push(usuario);
      fields.push('password'); values.push(password);
      fields.push('rol'); values.push(rol);

      if (email && has('email')) { fields.push('email'); values.push(email); }
      if (nombre && has('nombre')) { fields.push('nombre'); values.push(nombre); }
      if (apellido && has('apellido')) { fields.push('apellido'); values.push(apellido); }

      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO usuarios (${fields.join(', ')}) VALUES (${placeholders})`;

      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId, usuario, rol, email, nombre, apellido });
        });
      });
    },

    _getColumns: getColumns
  };
}

module.exports = { createUsersRepo };
