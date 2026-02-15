function createReservasRepo(db) {
  return {
    createPending({ habitacion_numero, wallet, monto_eth, expected_amount_wei, expected_amount_usdc, user_id }) {
      return new Promise((resolve, reject) => {
        const cols = ['habitacion_numero', 'wallet', 'monto_eth', 'estado_pago', 'estado_reserva', 'user_id'];
        const vals = [habitacion_numero, wallet || null, monto_eth || null, 'pendiente', 'activa', user_id || null];

        if (expected_amount_wei != null) {
          cols.push('expected_amount_wei');
          vals.push(String(expected_amount_wei));
        }
        if (expected_amount_usdc != null) {
          cols.push('expected_amount_usdc');
          vals.push(String(expected_amount_usdc));
        }

        const sql = `INSERT INTO reservas (${cols.join(', ')}) VALUES (${cols.map(()=>'?').join(', ')})`;
        db.query(sql, vals, (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId });
        });
      });
    },

    createLegacy({ habitacion_numero, check_in, check_out, noches, user_id = null, wallet = null }) {
      return new Promise((resolve, reject) => {
        const cols = ['habitacion_numero', 'check_in', 'check_out', 'noches', 'estado_pago', 'estado_reserva'];
        const vals = [habitacion_numero, check_in, check_out, noches, 'pendiente', 'activa'];

        if (user_id) {
          cols.push('user_id');
          vals.push(user_id);
        }
        if (wallet) {
          cols.push('wallet');
          vals.push(wallet);
        }

        const sql = `INSERT INTO reservas (${cols.join(', ')}) VALUES (${cols.map(()=>'?').join(', ')})`;
        db.query(sql, vals, (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId });
        });
      });
    },

    confirmPago({ reservaId, txHash }) {
      return new Promise((resolve, reject) => {
        const sql = `UPDATE reservas
                     SET estado_pago='pagada', tx_hash=?, paid_at=NOW()
                     WHERE id=?`;
        db.query(sql, [txHash, reservaId], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    },

    findByTxHash({ txHash }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM reservas WHERE tx_hash=? LIMIT 1', [String(txHash || '')], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    cancelar({ reservaId }) {
      return new Promise((resolve, reject) => {
        const sql = `UPDATE reservas SET estado_reserva='cancelada' WHERE id=?`;
        db.query(sql, [reservaId], (err, result) => {
          if (err) return reject(err);
          resolve({ affectedRows: result.affectedRows });
        });
      });
    },

    getPendientePorHabitacion({ habitacion }) {
      return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM reservas
                     WHERE habitacion_numero=?
                       AND estado_pago='pendiente'
                       AND (estado_reserva IS NULL OR estado_reserva='activa')
                     ORDER BY id DESC
                     LIMIT 1`;
        db.query(sql, [habitacion], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    getById({ id }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM reservas WHERE id=? LIMIT 1', [id], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    listLatest({ limit = 200 }) {
      return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM reservas ORDER BY id DESC LIMIT ${Number(limit)}`, (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    listByUser({ user_id, only, limit = 200 }) {
      return new Promise((resolve, reject) => {
        let where = 'WHERE user_id=?';
        const params = [user_id];

        // only: active | ocupada | pagada | history
        if (only === 'active') {
          where += " AND (estado_reserva IS NULL OR estado_reserva='activa')";
        }
        if (only === 'ocupada') {
          where += " AND (estado_reserva IS NULL OR estado_reserva='activa')";
        }
        if (only === 'pagada') {
          where += " AND estado_pago='pagada'";
        }
        if (only === 'history') {
          // include canceled too
        }

        const sql = `SELECT * FROM reservas ${where} ORDER BY id DESC LIMIT ${Number(limit)}`;
        db.query(sql, params, (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    },

    listByWallets({ wallets, only, limit = 200 }) {
      return new Promise((resolve, reject) => {
        const ws = (wallets || []).map(w => String(w).toLowerCase()).filter(Boolean);
        if (!ws.length) return resolve([]);

        let where = `WHERE LOWER(wallet) IN (${ws.map(()=>'?').join(',')})`;
        const params = ws;

        if (only === 'active') {
          where += " AND (estado_reserva IS NULL OR estado_reserva='activa')";
        }
        if (only === 'pagada') {
          where += " AND estado_pago='pagada'";
        }

        const sql = `SELECT * FROM reservas ${where} ORDER BY id DESC LIMIT ${Number(limit)}`;
        db.query(sql, params, (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
    }
  };
}

module.exports = { createReservasRepo };
