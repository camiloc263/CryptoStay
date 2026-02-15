const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db',
    multipleStatements: true,
  });

  const [cols] = await db.query('SHOW COLUMNS FROM reservas');
  const names = new Set(cols.map(c => c.Field));

  const alters = [];
  // Use VARCHAR to support full uint256 range (MySQL DECIMAL max precision is 65)
  if (!names.has('expected_amount_wei')) {
    alters.push("ADD COLUMN expected_amount_wei VARCHAR(80) NULL");
  }
  if (!names.has('expected_amount_usdc')) {
    alters.push("ADD COLUMN expected_amount_usdc VARCHAR(80) NULL");
  }

  if (alters.length) {
    await db.query(`ALTER TABLE reservas ${alters.join(', ')}`);
    console.log('✅ Migración OK: reservas expected_amount_wei/expected_amount_usdc');
  } else {
    console.log('ℹ️ Ya existen columnas expected_amount_* en reservas');
  }

  await db.end();
})();
