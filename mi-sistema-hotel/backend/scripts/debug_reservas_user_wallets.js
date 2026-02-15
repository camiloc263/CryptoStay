const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db',
  });

  const [wallets] = await db.query('SELECT user_id, wallet, is_primary, created_at FROM user_wallets ORDER BY user_id, is_primary DESC');
  const [res] = await db.query('SELECT id, user_id, wallet, habitacion_numero, estado_pago, estado_reserva, created_at FROM reservas ORDER BY id DESC LIMIT 30');

  console.log('--- user_wallets ---');
  console.table(wallets);

  console.log('--- reservas (last 30) ---');
  console.table(res.map(r => ({
    id: r.id,
    user_id: r.user_id,
    wallet: r.wallet,
    habitacion: r.habitacion_numero,
    pago: r.estado_pago,
    estado: r.estado_reserva,
    created_at: r.created_at,
  })));

  await db.end();
})();
