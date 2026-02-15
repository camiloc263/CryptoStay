const { wrap } = require('./wrap');

function createPreferencesController({ preferencesService, userEventsRepo }) {
  return {
    getMine: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const prefs = await preferencesService.getMine({ user_id: Number(req.user.id) });
      res.json(prefs || { user_id: Number(req.user.id), amenities: [] });
    }),

    setMine: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const { trip_type, budget, preferred_room_type, amenities } = req.body || {};
      await preferencesService.setMine({
        user_id: Number(req.user.id),
        trip_type,
        budget,
        preferred_room_type,
        amenities,
      });
      res.json({ ok: true });
    }),

    mergeMine: wrap(async (req, res) => {
      if (!req.user?.id) return res.status(401).json({ error: 'No session' });
      const { prefs, events } = req.body || {};
      const out = await preferencesService.mergeMine({ user_id: Number(req.user.id), localPrefs: prefs || {} });

      // best-effort import events
      if (Array.isArray(events) && events.length) {
        const max = Math.min(200, events.length);
        for (let i = 0; i < max; i++) {
          const ev = events[i];
          if (!ev) continue;
          const event_type = String(ev.event_type || '').trim();
          if (!event_type) continue;
          const room_numero = ev.room_numero ? String(ev.room_numero) : null;
          const meta_json = ev.meta ? JSON.stringify(ev.meta) : (ev.meta_json ? String(ev.meta_json) : null);
          const created_at = ev.created_at ? new Date(ev.created_at) : null;
          try {
            await userEventsRepo.insert({
              user_id: Number(req.user.id),
              event_type,
              room_numero,
              meta_json,
              created_at,
            });
          } catch {
            // ignore duplicates/invalid
          }
        }
      }

      res.json(out);
    }),
  };
}

module.exports = { createPreferencesController };
