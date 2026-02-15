function createUserWalletsRepo(db) {
  return {
    listByUser({ user_id }) {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT id, user_id, wallet, is_primary, created_at FROM user_wallets WHERE user_id=? ORDER BY is_primary DESC, id DESC',
          [user_id],
          (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          }
        );
      });
    },

    findByWallet({ wallet }) {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM user_wallets WHERE wallet=? LIMIT 1', [wallet], (err, results) => {
          if (err) return reject(err);
          resolve(results?.[0] || null);
        });
      });
    },

    async linkWallet({ user_id, wallet, is_primary = 1 }) {
      // If set primary, unset others
      if (is_primary) {
        await new Promise((resolve, reject) => {
          db.query('UPDATE user_wallets SET is_primary=0 WHERE user_id=?', [user_id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO user_wallets (user_id, wallet, is_primary) VALUES (?, ?, ?)';
        db.query(sql, [user_id, wallet, is_primary ? 1 : 0], (err, result) => {
          if (err) return reject(err);
          resolve({ id: result.insertId, user_id, wallet, is_primary: !!is_primary });
        });
      });
    },
  };
}

module.exports = { createUserWalletsRepo };
