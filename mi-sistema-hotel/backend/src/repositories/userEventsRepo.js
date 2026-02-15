function createUserEventsRepo(db) {
  return {
    insert({ user_id, event_type, room_numero = null, meta_json = null, created_at = null }) {
      return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO user_events (user_id, event_type, room_numero, meta_json, created_at) VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))';
        db.query(sql, [user_id, event_type, room_numero, meta_json, created_at], (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId });
        });
      });
    },

    listRecent({ user_id, limit = 100 }) {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT id, user_id, event_type, room_numero, meta_json, created_at FROM user_events WHERE user_id=? ORDER BY id DESC LIMIT ?',
          [user_id, Number(limit) || 100],
          (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          }
        );
      });
    },

    // Aggregates views by room_numero (fast signal)
    countByRoom({ user_id, event_type = 'room_view', limit = 50 }) {
      return new Promise((resolve, reject) => {
        db.query(
          `SELECT room_numero, COUNT(*) as n
           FROM user_events
           WHERE user_id=? AND event_type=? AND room_numero IS NOT NULL
           GROUP BY room_numero
           ORDER BY n DESC
           LIMIT ?`,
          [user_id, event_type, Number(limit) || 50],
          (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          }
        );
      });
    }
  };
}

module.exports = { createUserEventsRepo };
