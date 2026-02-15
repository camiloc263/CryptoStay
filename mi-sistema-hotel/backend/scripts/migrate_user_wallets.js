const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db',
  });

  async function colExists(table, col) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?',
      ['hotel_db', table, col]
    );
    return Number(rows?.[0]?.c || 0) > 0;
  }

  async function addCol(table, colSql) {
    try {
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${colSql}`);
      console.log(`✅ added ${table}.${colSql.split(' ')[0]}`);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('Duplicate column')) {
        console.log(`ℹ️ ${table}.${colSql.split(' ')[0]} already exists`);
      } else {
        throw e;
      }
    }
  }

  try {
    // usuarios: make sure we can store profile
    await addCol('usuarios', 'email VARCHAR(255) NULL');
    await addCol('usuarios', 'nombre VARCHAR(120) NULL');
    await addCol('usuarios', 'apellido VARCHAR(120) NULL');
    await addCol('usuarios', 'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');

    // reservas: link to user
    if (!(await colExists('reservas', 'user_id'))) {
      await addCol('reservas', 'user_id INT NULL');
      // optional index
      await db.query('CREATE INDEX idx_reservas_user_id ON reservas(user_id)');
      console.log('✅ created idx_reservas_user_id');
    } else {
      console.log('ℹ️ reservas.user_id already exists');
    }

    // user_wallets table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        wallet VARCHAR(60) NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wallet (wallet),
        INDEX idx_user_wallets_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ ensured table user_wallets');

  } finally {
    await db.end();
  }
})();
