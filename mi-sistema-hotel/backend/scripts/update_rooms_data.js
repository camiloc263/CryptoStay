const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasa',
  database: 'hotel_db'
});

const updates = [
  { 
    numero: '101', 
    titulo: 'Suite Ejecutiva', 
    descripcion: 'Vista a la ciudad, cama King y minibar.', 
    precio: 250000, 
    rating: 4.8, 
    reviews: 120 
  },
  { 
    numero: '102', 
    titulo: 'Habitación Doble', 
    descripcion: 'Dos camas sencillas, ideal para compartir.', 
    precio: 180000, 
    rating: 4.5, 
    reviews: 85 
  },
  { 
    numero: '103', 
    titulo: 'Habitación Sencilla', 
    descripcion: 'Acogedora y económica para viajeros solos.', 
    precio: 120000, 
    rating: 4.2, 
    reviews: 40 
  },
  { 
    numero: '104', 
    titulo: 'Suite Presidencial', 
    descripcion: 'Lujo total, jacuzzi y sala de estar.', 
    precio: 450000, 
    rating: 5.0, 
    reviews: 15 
  }
];

async function run() {
  console.log('Actualizando datos de habitaciones...');
  
  for (const u of updates) {
    const sql = `UPDATE habitaciones SET titulo=?, descripcion=?, precio_cop=?, rating=?, reviews=? WHERE numero=?`;
    await new Promise((resolve) => {
      db.query(sql, [u.titulo, u.descripcion, u.precio, u.rating, u.reviews, u.numero], (err) => {
        if (err) console.error(err.message);
        else console.log(`✓ ${u.numero} actualizado`);
        resolve();
      });
    });
  }
  
  db.end();
}

run();
