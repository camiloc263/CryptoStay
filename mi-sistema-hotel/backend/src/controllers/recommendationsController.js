const { wrap } = require('./wrap');

function createRecommendationsController({ recommendationsService }) {
  function safeParsePrefs(q) {
    try {
      if (!q) return null;
      const s = String(q);
      // allow plain JSON in query/body (demo use). keep it simple.
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  return {
    get: wrap(async (req, res) => {
      const limit = Number(req.query.limit || 6);

      // logged-in path
      if (req.user?.id) {
        const out = await recommendationsService.recommendForUser({ user_id: Number(req.user.id), limit });
        return res.json(out);
      }

      // guest path: accept prefs + events (optional)
      const prefs = safeParsePrefs(req.query.prefs) || null;
      const events = safeParsePrefs(req.query.events) || [];
      const out = await recommendationsService.recommendForGuest({ prefs, localEvents: events, limit });
      res.json(out);
    }),
  };
}

module.exports = { createRecommendationsController };
