function createUserPreferencesService({ preferencesRepo }) {
  function safeJsonParse(s) {
    try {
      if (!s) return null;
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function normalizeAmenities(arr) {
    const a = Array.isArray(arr) ? arr : [];
    const out = a
      .map(x => String(x || '').trim().toLowerCase())
      .filter(Boolean);
    // de-dupe
    return Array.from(new Set(out)).slice(0, 24);
  }

  return {
    async getMine({ user_id }) {
      const row = await preferencesRepo.getByUser({ user_id });
      if (!row) return null;
      return {
        user_id: row.user_id,
        trip_type: row.trip_type,
        budget: row.budget,
        preferred_room_type: row.preferred_room_type,
        amenities: safeJsonParse(row.amenities_json) || [],
        updated_at: row.updated_at,
      };
    },

    async setMine({ user_id, trip_type, budget, preferred_room_type, amenities }) {
      const amenitiesNorm = normalizeAmenities(amenities);
      await preferencesRepo.upsert({
        user_id,
        trip_type: trip_type ? String(trip_type).trim().toLowerCase() : null,
        budget: budget ? String(budget).trim().toLowerCase() : null,
        preferred_room_type: preferred_room_type ? String(preferred_room_type).trim().toLowerCase() : null,
        amenities_json: JSON.stringify(amenitiesNorm),
      });
      return { ok: true };
    },

    // Merge localStorage prefs into DB (DB values win unless empty)
    async mergeMine({ user_id, localPrefs }) {
      const current = await preferencesRepo.getByUser({ user_id });
      const cur = current || {};
      const lp = localPrefs || {};

      const merged = {
        trip_type: cur.trip_type || (lp.trip_type ? String(lp.trip_type).trim().toLowerCase() : null),
        budget: cur.budget || (lp.budget ? String(lp.budget).trim().toLowerCase() : null),
        preferred_room_type: cur.preferred_room_type || (lp.preferred_room_type ? String(lp.preferred_room_type).trim().toLowerCase() : null),
        amenities: normalizeAmenities((safeJsonParse(cur.amenities_json) || []).concat(lp.amenities || [])),
      };

      await preferencesRepo.upsert({
        user_id,
        trip_type: merged.trip_type,
        budget: merged.budget,
        preferred_room_type: merged.preferred_room_type,
        amenities_json: JSON.stringify(merged.amenities),
      });

      return { ok: true, merged };
    }
  };
}

module.exports = { createUserPreferencesService };
