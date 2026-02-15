const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasa',
  database: 'hotel_db',
  multipleStatements: true,
});

const sql = `
CREATE TABLE IF NOT EXISTS habitacion_fotos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habitacion_numero VARCHAR(10) NOT NULL,
  url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (habitacion_numero)
);
`;

db.query(sql, (err) => {
  if (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } else {
    console.log('Migration OK: habitacion_fotos');
  }
  db.end();
});
