/**
 * HotelSys Auto-Checkout Job
 *
 * Rule (per requirements):
 * - At 00:00 of check_out day (and onward), move room to estado='limpieza'
 * - If reservation is pagada -> mark estado_reserva='finalizada'
 * - If pendiente -> keep estado_reserva='activa' (but room still goes to limpieza)
 *
 * Run this script every 5 minutes via Windows Task Scheduler.
 */

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasa',
  database: 'hotel_db',
});

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

(async () => {
  const now = new Date();
  console.log(`[autoCheckout] start ${now.toISOString()}`);

  // Select active reservations whose checkout date is today or earlier
  // (00:00 rule is naturally satisfied by DATE comparison)
  const due = await q(
    `SELECT id, habitacion_numero, estado_pago
     FROM reservas
     WHERE (estado_reserva IS NULL OR estado_reserva='activa')
       AND check_out IS NOT NULL
       AND DATE(check_out) <= CURDATE()`
  );

  if (!due.length) {
    console.log('[autoCheckout] no due reservations');
    db.end();
    return;
  }

  // Move rooms to limpieza
  const rooms = [...new Set(due.map((r) => String(r.habitacion_numero)))];
  await q(
    `UPDATE habitaciones
     SET estado='limpieza'
     WHERE numero IN (${rooms.map(() => '?').join(',')})`,
    rooms
  );

  // Finalize paid reservations
  const paidIds = due.filter((r) => r.estado_pago === 'pagada').map((r) => r.id);
  if (paidIds.length) {
    await q(
      `UPDATE reservas
       SET estado_reserva='finalizada'
       WHERE id IN (${paidIds.map(() => '?').join(',')})`,
      paidIds
    );
  }

  console.log(`[autoCheckout] processed rooms=${rooms.join(',')} paid_finalized=${paidIds.length}`);
  db.end();
})().catch((err) => {
  console.error('[autoCheckout] ERROR', err);
  try { db.end(); } catch {}
  process.exitCode = 1;
});
