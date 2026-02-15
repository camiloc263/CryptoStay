const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'sasa',
    database: 'hotel_db',
  });

  // Create reviews table (per room, per user, per stay)
  await db.query(`
    CREATE TABLE IF NOT EXISTS habitacion_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      habitacion_numero VARCHAR(10) NOT NULL,
      user_id INT NULL,
      reserva_id INT NULL,
      rating TINYINT NOT NULL,
      comment TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reviews_room (habitacion_numero),
      INDEX idx_reviews_user (user_id),
      INDEX idx_reviews_reserva (reserva_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Optional: prevent duplicate review per reserva
  try {
    await db.query(`CREATE UNIQUE INDEX uq_reviews_reserva ON habitacion_reviews(reserva_id)`);
  } catch (e) {
    // ignore if already exists or reserva_id nulls
  }

  console.log('✅ Migration OK: habitacion_reviews');
  await db.end();
})();
