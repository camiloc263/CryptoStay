const mysql = require('mysql2');

function createDbConnection({ host, user, password, database }) {
  const db = mysql.createConnection({ host, user, password, database });

  db.connect((err) => {
    if (err) {
      console.error('❌ Error conectando a MySQL:', err);
      return;
    }
    console.log('✅ Conectado exitosamente a MySQL (Modo Persistente)');
  });

  return db;
}

module.exports = { createDbConnection };
