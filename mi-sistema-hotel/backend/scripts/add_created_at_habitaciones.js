const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db',
  });

  try {
    await db.execute('ALTER TABLE habitaciones ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    console.log('✅ added habitaciones.created_at');
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('Duplicate column')) {
      console.log('ℹ️ habitaciones.created_at already exists');
    } else {
      console.error('❌ failed to add created_at:', msg);
      process.exitCode = 1;
    }
  } finally {
    await db.end();
  }
})();
