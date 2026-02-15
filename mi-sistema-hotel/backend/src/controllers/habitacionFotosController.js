const { wrap } = require('./wrap');

function createHabitacionFotosController({ fotosService, upload }) {
  return {
    uploadFotos: [
      upload.array('fotos', 10),
      wrap(async (req, res) => {
        const habitacion_numero = req.params.numero;
        const replace = String(req.body?.replace || '').trim() === '1' || String(req.body?.replace || '').toLowerCase() === 'true';
        const old_numero = req.body?.old_numero || null;
        const r = await fotosService.saveUploaded({ habitacion_numero, files: req.files, replace, old_numero });
        res.json({ mensaje: replace ? 'Fotos actualizadas' : 'Fotos cargadas', ...r });
      })
    ]
  };
}

module.exports = { createHabitacionFotosController };
