const path = require('path');

function createHabitacionFotosService({ fotosRepo }) {
  return {
    async listUrls({ habitacion_numero }) {
      const rows = await fotosRepo.listByHabitacion({ habitacion_numero });
      return rows.map(r => r.url);
    },

    async saveUploaded({ habitacion_numero, files, publicBase = '/uploads', replace = false, old_numero = null }) {
      if (!habitacion_numero) {
        const err = new Error('habitacion_numero requerido');
        err.status = 400;
        throw err;
      }

      if (replace) {
        // if number changed, delete old gallery too
        if (old_numero && String(old_numero) !== String(habitacion_numero)) {
          await fotosRepo.deleteByHabitacion({ habitacion_numero: String(old_numero) });
        }
        await fotosRepo.deleteByHabitacion({ habitacion_numero: String(habitacion_numero) });
      }

      const urls = (files || []).map(f => path.posix.join(publicBase, f.filename));
      await fotosRepo.insertMany({ habitacion_numero: String(habitacion_numero), urls });
      return { urls, replaced: !!replace };
    }
  };
}

module.exports = { createHabitacionFotosService };
