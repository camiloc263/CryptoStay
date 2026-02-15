function createUserPreferencesRepo(db) {
  return {
    getByUser({ user_id }) {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT id, user_id, trip_type, budget, preferred_room_type, amenities_json, updated_at FROM user_preferences WHERE user_id=? LIMIT 1',
          [user_id],
          (err, results) => {
            if (err) return reject(err);
            resolve(results?.[0] || null);
          }
        );
      });
    },

    upsert({ user_id, trip_type, budget, preferred_room_type, amenities_json }) {
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO user_preferences (user_id, trip_type, budget, preferred_room_type, amenities_json)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            trip_type=VALUES(trip_type),
            budget=VALUES(budget),
            preferred_room_type=VALUES(preferred_room_type),
            amenities_json=VALUES(amenities_json),
            updated_at=CURRENT_TIMESTAMP`;

        db.query(
          sql,
          [user_id, trip_type || null, budget || null, preferred_room_type || null, amenities_json || null],
          (err) => {
            if (err) return reject(err);
            resolve({ ok: true });
          }
        );
      });
    }
  };
}

module.exports = { createUserPreferencesRepo };
