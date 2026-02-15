window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.habitacionManageModal = (function(){
  const clients = HotelSys.core?.clients;

  async function crearHabitacion(){
    let pickedFiles = null;

    const { value: v } = await Swal.fire({
      title: 'Crear habitación',
      html: `
        <div class="hs-form">
          <div class="row g-3">
            <div class="col-6">
              <label class="hs-field">
                <span>Número</span>
                <input id="n-num" class="swal2-input hs-input" placeholder="Ej: 101">
              </label>
            </div>
            <div class="col-6">
              <label class="hs-field">
                <span>Tipo</span>
                <select id="n-tip" class="swal2-select hs-select">
                  <option>Simple</option>
                  <option>Doble</option>
                  <option>Suite</option>
                </select>
              </label>
            </div>
          </div>

          <label class="hs-field">
            <span>Precio (COP / noche)</span>
            <input id="n-precio" type="number" class="swal2-input hs-input" placeholder="Ej: 199000" min="0">
          </label>

          <label class="hs-field">
            <span>Descripción (Opcional)</span>
            <textarea id="n-desc" class="swal2-textarea hs-input" placeholder="Ej: Vista al mar, cama King..." rows="2" style="resize:none"></textarea>
          </label>

          <label class="hs-field">
            <span>Fotos (galería)</span>
            <input id="n-fotos" type="file" class="form-control" multiple accept="image/*">
            <div class="hs-help">Puedes subir hasta 10 fotos.</div>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' },
      didOpen: () => {
        const inp = document.getElementById('n-fotos');
        inp?.addEventListener('change', () => { pickedFiles = inp.files; });
      },
      preConfirm: () => {
        const numero = (document.getElementById('n-num')?.value || '').trim();
        const tipo = (document.getElementById('n-tip')?.value || '').trim();
        const precio_cop = Number(document.getElementById('n-precio')?.value || 0);
        const descripcion = (document.getElementById('n-desc')?.value || '').trim();
        if (!numero) { Swal.showValidationMessage('Ingresa el número.'); return false; }
        if (!tipo) { Swal.showValidationMessage('Selecciona el tipo.'); return false; }
        return { numero, tipo, precio_cop, descripcion };
      }
    });

    if (!v) return false;

    await clients.habitaciones.create(v);
    if (pickedFiles && pickedFiles.length) {
      await clients.habitaciones.uploadFotos(v.numero, { files: pickedFiles, replace: true });
    }

    return true;
  }

  async function editarHabitacion({ habitaciones, id }){
    const h = (habitaciones || []).find(x => Number(x.id) === Number(id));
    let pickedFiles = null;
    const oldNumero = String(h?.numero || '').trim();

    const { value: v } = await Swal.fire({
      title: 'Actualizar habitación',
      html: `
        <div class="hs-form">
          <div class="row g-3">
            <div class="col-6">
              <label class="hs-field">
                <span>Número</span>
                <input id="e-num" class="swal2-input hs-input" value="${h?.numero ?? ''}" placeholder="Ej: 101" />
              </label>
            </div>
            <div class="col-6">
              <label class="hs-field">
                <span>Tipo</span>
                <select id="e-tip" class="swal2-select hs-select">
                  <option ${String(h?.tipo).toLowerCase()==='simple'?'selected':''}>Simple</option>
                  <option ${String(h?.tipo).toLowerCase()==='doble'?'selected':''}>Doble</option>
                  <option ${String(h?.tipo).toLowerCase()==='suite'?'selected':''}>Suite</option>
                </select>
              </label>
            </div>
          </div>

          <label class="hs-field">
            <span>Precio (COP / noche)</span>
            <input id="e-precio" type="number" class="swal2-input hs-input" value="${Number(h?.precio_cop || 0)}" min="0" />
          </label>

          <label class="hs-field">
            <span>Descripción (Opcional)</span>
            <textarea id="e-desc" class="swal2-textarea hs-input" placeholder="Ej: Vista al mar..." rows="2" style="resize:none">${h?.descripcion || ''}</textarea>
          </label>

          <label class="hs-field">
            <span>Fotos (reemplazar galería)</span>
            <input id="e-fotos" type="file" class="form-control" multiple accept="image/*">
            <div class="hs-help">Si subes fotos aquí, se reemplaza toda la galería anterior.</div>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: { popup: 'hs-swal-popup hs-swal-form', confirmButton: 'hs-swal-confirm', cancelButton: 'hs-swal-cancel' },
      didOpen: () => {
        const inp = document.getElementById('e-fotos');
        inp?.addEventListener('change', () => { pickedFiles = inp.files; });
      },
      preConfirm: () => {
        const numero = (document.getElementById('e-num')?.value || '').trim();
        const tipo = (document.getElementById('e-tip')?.value || '').trim();
        const precio_cop = Number(document.getElementById('e-precio')?.value || 0);
        const descripcion = (document.getElementById('e-desc')?.value || '').trim();
        if (!numero) { Swal.showValidationMessage('Ingresa el número.'); return false; }
        if (!tipo) { Swal.showValidationMessage('Selecciona el tipo.'); return false; }
        return { numero, tipo, precio_cop, descripcion };
      }
    });

    if (!v) return false;

    await clients.habitaciones.update(id, v);

    if (pickedFiles && pickedFiles.length) {
      await clients.habitaciones.uploadFotos(v.numero, { files: pickedFiles, replace: true, old_numero: oldNumero });
    }

    return true;
  }

  async function eliminarHabitacion({ id }){
    const r = await Swal.fire({ title: '¿Borrar?', showCancelButton: true, confirmButtonText: 'Sí, borrar', cancelButtonText: 'Cancelar' });
    if (!r.isConfirmed) return false;
    await clients.habitaciones.deleteById(id);
    return true;
  }

  return { crearHabitacion, editarHabitacion, eliminarHabitacion };
})();
