window.HotelSys = window.HotelSys || {};
HotelSys.ai = HotelSys.ai || {};

HotelSys.ai.prefsQuiz = (function(){
  const $ = (sel) => document.querySelector(sel);

  function render({ mountId = 'hs-prefs', prefs, onSave }){
    const el = document.getElementById(mountId);
    if (!el) return;

    const trip = prefs?.trip_type || '';
    const budget = prefs?.budget || '';
    const type = prefs?.preferred_room_type || '';

    el.innerHTML = `
      <div class="hs-ai-card">
        <div class="hs-ai-head">
          <div>
            <div class="hs-ai-title">Recomendadas para ti</div>
            <div class="hs-ai-sub">Cuéntanos qué te gusta (30s) y priorizaremos habitaciones que coincidan contigo.</div>
          </div>
          <button class="hs-ai-btn" id="hs-ai-save" type="button">Guardar</button>
        </div>

        <div class="hs-ai-grid">
          <div>
            <div class="hs-ai-label">Tipo de viaje</div>
            <select id="hs-ai-trip" class="hs-ai-select">
              <option value="" ${trip===''?'selected':''}>—</option>
              <option value="work" ${trip==='work'?'selected':''}>Trabajo</option>
              <option value="couple" ${trip==='couple'?'selected':''}>Pareja</option>
              <option value="family" ${trip==='family'?'selected':''}>Familiar</option>
              <option value="solo" ${trip==='solo'?'selected':''}>Solo</option>
            </select>
          </div>

          <div>
            <div class="hs-ai-label">Presupuesto</div>
            <select id="hs-ai-budget" class="hs-ai-select">
              <option value="" ${budget===''?'selected':''}>—</option>
              <option value="low" ${budget==='low'?'selected':''}>Económico</option>
              <option value="mid" ${budget==='mid'?'selected':''}>Medio</option>
              <option value="premium" ${budget==='premium'?'selected':''}>Premium</option>
            </select>
          </div>

          <div>
            <div class="hs-ai-label">Tipo preferido</div>
            <select id="hs-ai-type" class="hs-ai-select">
              <option value="" ${type===''?'selected':''}>—</option>
              <option value="simple" ${type==='simple'?'selected':''}>Simple</option>
              <option value="doble" ${type==='doble'?'selected':''}>Doble</option>
              <option value="suite" ${type==='suite'?'selected':''}>Suite</option>
            </select>
          </div>

          <div>
            <div class="hs-ai-label">Preferencias (opcional)</div>
            <div class="hs-ai-chips" id="hs-ai-amenities"></div>
          </div>
        </div>
      </div>
    `;

    const amenityList = ['wifi','breakfast','view','jacuzzi','parking','quiet','pet'];
    const amenityLabel = { wifi:'WiFi', breakfast:'Desayuno', view:'Vista', jacuzzi:'Jacuzzi', parking:'Parqueadero', quiet:'Tranquilo', pet:'Pet-friendly' };
    const selected = new Set((prefs?.amenities || []).map(x => String(x).toLowerCase()));
    const wrap = $('#hs-ai-amenities');
    wrap.innerHTML = amenityList.map(a => {
      const on = selected.has(a);
      const label = amenityLabel[a] || a;
      return `<button type="button" class="hs-ai-chip ${on?'on':''}" data-a="${a}">${label}</button>`;
    }).join('');

    wrap.querySelectorAll('button[data-a]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-a');
        if (!a) return;
        if (selected.has(a)) selected.delete(a); else selected.add(a);
        btn.classList.toggle('on');
      });
    });

    $('#hs-ai-save').addEventListener('click', async () => {
      const out = {
        trip_type: String($('#hs-ai-trip').value || '') || null,
        budget: String($('#hs-ai-budget').value || '') || null,
        preferred_room_type: String($('#hs-ai-type').value || '') || null,
        amenities: Array.from(selected),
      };
      await (onSave && onSave(out));
    });
  }

  return { render };
})();
