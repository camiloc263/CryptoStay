window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.reviewModal = (function(){
  const clients = HotelSys.core?.clients;

  function starsHtml(value){
    const v = Number(value || 0);
    return `
      <div class="hs-stars" role="radiogroup" aria-label="Calificación">
        ${[1,2,3,4,5].map(i => `
          <button type="button" class="hs-star ${i<=v?'on':''}" data-v="${i}" aria-label="${i} estrella${i>1?'s':''}">★</button>
        `).join('')}
      </div>
    `;
  }

  async function open({ habitacion_numero, reserva_id = null } = {}){
    const { value: v } = await Swal.fire({
      title: 'Califica tu estadía',
      html: `
        <div class="hs-form">
          <div class="hs-field">
            <span>Calificación</span>
            <div id="hs-stars-wrap">${starsHtml(5)}</div>
            <input id="hs-rating" type="hidden" value="5" />
          </div>

          <label class="hs-field">
            <span>Comentario (opcional)</span>
            <textarea id="hs-comment" class="swal2-textarea hs-textarea" placeholder="¿Qué te gustó? ¿Qué mejorarías?" style="height:110px"></textarea>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar reseña',
      cancelButtonText: 'Cancelar',
      showCloseButton: true,
      focusConfirm: false,
      customClass: {
        popup: 'hs-swal-popup hs-swal-form',
        confirmButton: 'hs-swal-confirm',
        cancelButton: 'hs-swal-cancel'
      },
      didOpen: () => {
        const wrap = document.getElementById('hs-stars-wrap');
        const input = document.getElementById('hs-rating');
        const set = (n) => {
          input.value = String(n);
          wrap.innerHTML = starsHtml(n);
          wrap.querySelectorAll('.hs-star').forEach(btn => {
            btn.addEventListener('click', () => set(Number(btn.getAttribute('data-v'))));
          });
        };
        // bind initial
        wrap.querySelectorAll('.hs-star').forEach(btn => {
          btn.addEventListener('click', () => set(Number(btn.getAttribute('data-v'))));
        });
      },
      preConfirm: () => {
        const rating = Number(document.getElementById('hs-rating')?.value || 0);
        const comment = String(document.getElementById('hs-comment')?.value || '').trim();
        if (!rating || rating < 1 || rating > 5) {
          Swal.showValidationMessage('Selecciona una calificación (1 a 5).');
          return false;
        }
        return { rating, comment };
      }
    });

    if (!v) return false;

    await clients.api.post(`/habitaciones/${encodeURIComponent(habitacion_numero)}/reviews`, {
      rating: v.rating,
      comment: v.comment,
      reserva_id
    });

    await Swal.fire({
      icon: 'success',
      title: '¡Gracias!',
      text: 'Tu reseña fue enviada.',
      customClass: { popup: 'hs-swal-popup', confirmButton: 'hs-swal-confirm' },
      buttonsStyling: false,
    });

    return true;
  }

  return { open };
})();
