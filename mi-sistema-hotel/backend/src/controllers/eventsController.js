const { wrap } = require('./wrap');

function createEventsController({ userEventsRepo }) {
  return {
    add: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const { event_type, room_numero, meta } = req.body || {};
      const t = String(event_type || '').trim();
      if (!t) return res.status(400).json({ error: 'Missing event_type' });

      await userEventsRepo.insert({
        user_id: Number(req.user.id),
        event_type: t,
        room_numero: room_numero ? String(room_numero) : null,
        meta_json: meta ? JSON.stringify(meta) : null,
      });

      res.json({ ok: true });
    }),
  };
}

module.exports = { createEventsController };
