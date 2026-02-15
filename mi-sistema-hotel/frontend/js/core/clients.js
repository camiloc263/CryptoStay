window.HotelSys = window.HotelSys || {};
HotelSys.core = HotelSys.core || {};

HotelSys.core.clients = (function(){
  const api = (HotelSys.core.createApiClient)
    ? HotelSys.core.createApiClient({ baseUrl: 'http://localhost:3000/api' })
    : null;

  return {
    api,
    rates: {
      get: () => api.get('/rates')
    },
    web3: {
      getConfig: () => api.get('/web3/config')
    },
    habitaciones: {
      list: () => api.get('/habitaciones'),
      create: ({ numero, tipo, precio_cop, descripcion }) => api.post('/habitaciones/crear', { numero, tipo, precio_cop, descripcion }),
      update: (id, { numero, tipo, precio_cop, descripcion }) => api.put(`/habitaciones/${id}`, { numero, tipo, precio_cop, descripcion }),
      deleteById: (id) => api.del(`/habitaciones/${id}`),
      setDestacado: (numero, destacado) => api.post(`/habitaciones/${numero}/destacado`, { destacado }),
      uploadFotos: async (numero, { files, replace = true, old_numero = null }) => {
        const fd = new FormData();
        if (replace) fd.append('replace', '1');
        if (old_numero) fd.append('old_numero', String(old_numero));
        (Array.from(files || [])).slice(0, 10).forEach(f => fd.append('fotos', f));

        const r = await fetch(`http://localhost:3000/api/habitaciones/${encodeURIComponent(numero)}/fotos`, {
          method: 'POST',
          body: fd
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const err = new Error(data.error || data.mensaje || `HTTP ${r.status}`);
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      }
    },
    reservas: {
      getById: (id) => api.get(`/reservas/${id}`),
      getPendienteByHabitacion: (habitacion) => api.get(`/reservas/pendiente/${habitacion}`),
      createPending: ({ habitacion_numero, wallet = null, monto_eth = null }) => api.post('/reservas/pending', { habitacion_numero, wallet, monto_eth }),
      confirmarPago: (reservaId, txHash) => api.post('/reservas/confirmar-pago', { reservaId, txHash })
    }
  };
})();
