function createRecommendationsService({ habitacionesService, preferencesService, userEventsRepo, web3ConfigService }) {
  function budgetBand(precio_cop) {
    const p = Number(precio_cop || 0);
    if (!p) return 'unknown';
    if (p <= 1500000) return 'low';
    if (p <= 4000000) return 'mid';
    return 'premium';
  }

  function scoreRoom({ room, prefs, viewCounts }) {
    let score = 0;
    const reasons = [];

    // base
    if (room.destacado) { score += 5; reasons.push('Habitación destacada'); }
    if (room.rating) { score += Math.min(10, Number(room.rating) * 2); reasons.push('Buena calificación'); }

    // type match
    const prefType = prefs?.preferred_room_type;
    if (prefType && room.tipo && String(room.tipo).toLowerCase() === String(prefType).toLowerCase()) {
      score += 15;
      reasons.push(`Coincide con tu tipo preferido (${prefType})`);
    }

    // budget match
    const prefBudget = prefs?.budget;
    const band = budgetBand(room.precio_cop);
    if (prefBudget && band === prefBudget) {
      score += 18;
      const mapB = { low:'económico', mid:'medio', premium:'premium' };
      reasons.push(`Coincide con tu presupuesto (${mapB[prefBudget] || prefBudget})`);
    } else if (prefBudget && band !== 'unknown') {
      // slight penalty if far
      score += 2;
    }

    // trip type heuristics
    const trip = prefs?.trip_type;
    if (trip && room.tipo) {
      const t = String(room.tipo).toLowerCase();
      if (trip === 'work' && (t.includes('simple') || t.includes('doble'))) {
        score += 5; reasons.push('Ideal para viaje de trabajo');
      }
      if (trip === 'couple' && t.includes('suite')) {
        score += 7; reasons.push('Ideal para pareja');
      }
      if (trip === 'family' && (t.includes('doble') || t.includes('suite'))) {
        score += 6; reasons.push('Ideal para familia');
      }
    }

    // behavior: views
    const v = viewCounts?.[String(room.numero)] || 0;
    if (v) {
      score += Math.min(12, v * 2);
      reasons.push(`Has visto esta habitación ${v} veces`);
    }

    // normalize reasons
    const uniq = Array.from(new Set(reasons)).slice(0, 2);
    return { score, reasons: uniq };
  }

  function safeJsonParse(x) {
    try { return x ? JSON.parse(x) : null; } catch { return null; }
  }

  async function getWeb3Flags() {
    // Best-effort: if config is readable, enable badge
    try {
      const cfg = web3ConfigService.getConfig();
      return {
        web3Enabled: !!(cfg?.hotelV2Address || cfg?.hotelAddress),
        hotelV2Address: cfg?.hotelV2Address || null,
        usdcAddress: cfg?.usdcAddress || null,
      };
    } catch {
      return { web3Enabled: false };
    }
  }

  return {
    /**
     * Logged-in recommendations (uses DB prefs + events).
     */
    async recommendForUser({ user_id, limit = 6 }) {
      const prefs = await preferencesService.getMine({ user_id });
      const rooms = await habitacionesService.listAllWithFotos();

      const countsRows = await userEventsRepo.countByRoom({ user_id, event_type: 'room_view', limit: 200 });
      const viewCounts = (countsRows || []).reduce((acc, r) => {
        acc[String(r.room_numero)] = Number(r.n || 0);
        return acc;
      }, {});

      const scored = (rooms || []).map(room => {
        const s = scoreRoom({ room, prefs, viewCounts });
        return { ...room, _score: s.score, reasons: s.reasons };
      });

      scored.sort((a, b) => (b._score - a._score) || (Number(b.destacado) - Number(a.destacado)) || (Number(b.precio_cop) - Number(a.precio_cop)));

      const flags = await getWeb3Flags();

      return {
        prefs: prefs || null,
        web3: flags,
        items: scored.slice(0, Number(limit) || 6).map(x => ({
          numero: x.numero,
          tipo: x.tipo,
          precio_cop: x.precio_cop,
          descripcion: x.descripcion,
          fotos: x.fotos,
          destacado: !!x.destacado,
          reasons: x.reasons || [],
        }))
      };
    },

    /**
     * Guest recommendations: compute using provided prefs + local view counts.
     */
    async recommendForGuest({ prefs, localEvents, limit = 6 }) {
      const rooms = await habitacionesService.listAllWithFotos();

      const viewCounts = (Array.isArray(localEvents) ? localEvents : [])
        .filter(e => e && e.event_type === 'room_view' && e.room_numero)
        .reduce((acc, e) => {
          const k = String(e.room_numero);
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});

      const scored = (rooms || []).map(room => {
        const s = scoreRoom({ room, prefs, viewCounts });
        return { ...room, _score: s.score, reasons: s.reasons };
      });

      scored.sort((a, b) => (b._score - a._score) || (Number(b.destacado) - Number(a.destacado)) || (Number(b.precio_cop) - Number(a.precio_cop)));

      const flags = await getWeb3Flags();

      return {
        prefs: prefs || null,
        web3: flags,
        items: scored.slice(0, Number(limit) || 6).map(x => ({
          numero: x.numero,
          tipo: x.tipo,
          precio_cop: x.precio_cop,
          descripcion: x.descripcion,
          fotos: x.fotos,
          destacado: !!x.destacado,
          reasons: x.reasons || [],
        }))
      };
    },
  };
}

module.exports = { createRecommendationsService };
