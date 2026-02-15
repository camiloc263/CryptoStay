window.HotelSys = window.HotelSys || {};
HotelSys.ai = HotelSys.ai || {};

HotelSys.ai.recommender = (function(){
  function budgetBand(precio_cop){
    const p = Number(precio_cop || 0);
    if (!p) return 'unknown';
    if (p <= 1500000) return 'low';
    if (p <= 4000000) return 'mid';
    return 'premium';
  }

  function countViews(events){
    const vc = {};
    (events || []).forEach(e => {
      if (e?.event_type !== 'room_view') return;
      if (!e?.room_numero) return;
      const k = String(e.room_numero);
      vc[k] = (vc[k] || 0) + 1;
    });
    return vc;
  }

  function scoreRoom({ room, prefs, viewCounts }){
    let score = 0;
    const reasons = [];

    if (room.destacado) { score += 5; reasons.push('Habitación destacada'); }
    if (room.rating) { score += Math.min(10, Number(room.rating) * 2); reasons.push('Buena calificación'); }

    const prefType = prefs?.preferred_room_type;
    if (prefType && room.tipo && String(room.tipo).toLowerCase() === String(prefType).toLowerCase()) {
      score += 15;
      reasons.push(`Coincide con tu tipo preferido (${prefType})`);
    }

    const prefBudget = prefs?.budget;
    const band = budgetBand(room.precio_cop);
    if (prefBudget && band === prefBudget) {
      score += 18;
      const mapB = { low:'económico', mid:'medio', premium:'premium' };
      reasons.push(`Coincide con tu presupuesto (${mapB[prefBudget] || prefBudget})`);
    } else if (prefBudget && band !== 'unknown') {
      score += 2;
    }

    const trip = prefs?.trip_type;
    if (trip && room.tipo) {
      const t = String(room.tipo).toLowerCase();
      if (trip === 'work' && (t.includes('simple') || t.includes('doble'))) { score += 5; reasons.push('Ideal para viaje de trabajo'); }
      if (trip === 'couple' && t.includes('suite')) { score += 7; reasons.push('Ideal para pareja'); }
      if (trip === 'family' && (t.includes('doble') || t.includes('suite'))) { score += 6; reasons.push('Ideal para familia'); }
    }

    const v = viewCounts?.[String(room.numero)] || 0;
    if (v) { score += Math.min(12, v * 2); reasons.push(`Has visto esta habitación ${v} veces`); }

    return { score, reasons: Array.from(new Set(reasons)).slice(0, 2) };
  }

  function recommend({ rooms, prefs, events, limit = 6 }){
    const vc = countViews(events || []);
    const scored = (rooms || []).map(room => {
      const s = scoreRoom({ room, prefs, viewCounts: vc });
      return { ...room, _score: s.score, reasons: s.reasons };
    });
    scored.sort((a,b) => (b._score - a._score) || (Number(b.destacado) - Number(a.destacado)) || (Number(b.precio_cop) - Number(a.precio_cop)));
    return scored.slice(0, Number(limit) || 6);
  }

  return { recommend };
})();
