const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasa',
  database: 'hotel_db',
  multipleStatements: true,
});

async function q(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function main(){
  console.log('Migrating: multi-hotel');

  await q(`
    CREATE TABLE IF NOT EXISTS hoteles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_user_id INT NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      slug VARCHAR(140) NULL,
      pais VARCHAR(80) NULL,
      ciudad VARCHAR(80) NULL,
      direccion VARCHAR(160) NULL,
      descripcion VARCHAR(500) NULL,
      telefono VARCHAR(40) NULL,
      email VARCHAR(120) NULL,
      wallet VARCHAR(80) NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(owner_user_id),
      UNIQUE KEY uq_hoteles_owner_slug (owner_user_id, slug)
    );
  `);
  console.log('✓ table hoteles');

  // habitaciones.hotel_id
  await q(`ALTER TABLE habitaciones ADD COLUMN hotel_id INT NULL AFTER id;`).catch(()=>{});
  await q(`ALTER TABLE habitaciones ADD INDEX idx_habitaciones_hotel (hotel_id);`).catch(()=>{});
  console.log('✓ habitaciones.hotel_id');

  // reservas.hotel_id
  await q(`ALTER TABLE reservas ADD COLUMN hotel_id INT NULL AFTER id;`).catch(()=>{});
  await q(`ALTER TABLE reservas ADD INDEX idx_reservas_hotel (hotel_id);`).catch(()=>{});
  console.log('✓ reservas.hotel_id');

  // habitacion_fotos.hotel_id (optional but recommended)
  await q(`ALTER TABLE habitacion_fotos ADD COLUMN hotel_id INT NULL AFTER id;`).catch(()=>{});
  await q(`ALTER TABLE habitacion_fotos ADD INDEX idx_fotos_hotel (hotel_id);`).catch(()=>{});
  console.log('✓ habitacion_fotos.hotel_id');

  // Create default hotel for each existing user (if not exists)
  const users = await q(`SELECT id FROM usuarios`);
  for (const u of users) {
    const uid = u.id;
    const existing = await q(`SELECT id FROM hoteles WHERE owner_user_id=? ORDER BY id ASC LIMIT 1`, [uid]);
    if (existing.length) continue;

    const slug = `default-${uid}`;
    const name = `Mi Hotel ${uid}`;
    const ins = await q(`INSERT INTO hoteles (owner_user_id, nombre, slug) VALUES (?,?,?)`, [uid, name, slug]);
    const hotelId = ins.insertId;

    // Assign all existing habitaciones (global) to this default hotel ONLY if they don't have hotel_id yet.
    await q(`UPDATE habitaciones SET hotel_id=? WHERE hotel_id IS NULL`, [hotelId]);
    // reservas: try to map by habitacion_numero
    await q(`UPDATE reservas r JOIN habitaciones h ON h.numero=r.habitacion_numero SET r.hotel_id=h.hotel_id WHERE r.hotel_id IS NULL`);
    // fotos: map by habitacion_numero
    await q(`UPDATE habitacion_fotos f JOIN habitaciones h ON h.numero=f.habitacion_numero SET f.hotel_id=h.hotel_id WHERE f.hotel_id IS NULL`);

    console.log(`✓ default hotel created for user ${uid} (hotel_id=${hotelId}) and assigned existing data`);
  }

  console.log('Migration multi-hotel: OK');
}

main().catch((e)=>{
  console.error('Migration failed:', e.message);
  process.exitCode = 1;
}).finally(()=>db.end());
