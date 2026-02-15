const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasa',
  database: 'hotel_db',
  multipleStatements: true,
});

const sql = `
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  trip_type VARCHAR(32) NULL,
  budget VARCHAR(32) NULL,
  preferred_room_type VARCHAR(32) NULL,
  amenities_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user (user_id)
);

CREATE TABLE IF NOT EXISTS user_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  room_numero VARCHAR(10) NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_type (user_id, event_type),
  INDEX idx_user_room (user_id, room_numero)
);
`;

db.query(sql, (err) => {
  if (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } else {
    console.log('Migration OK: user_preferences + user_events');
  }
  db.end();
});
