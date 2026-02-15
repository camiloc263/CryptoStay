const { wrap } = require('./wrap');

function createAuthController({ authService }) {
  return {
    login: wrap(async (req, res) => {
      const { usuario, password } = req.body;
      const u = await authService.login({ usuario, password });
      res.json({ mensaje: 'Login exitoso', id: u.id, usuario: u.usuario, rol: u.rol });
    }),

    register: wrap(async (req, res) => {
      const { usuario, password, email, nombre, apellido } = req.body;
      const u = await authService.register({ usuario, password, email, nombre, apellido, rol: 'huesped' });
      res.status(201).json({ mensaje: 'Registro exitoso', id: u.id, usuario: u.usuario, rol: u.rol });
    })
  };
}

module.exports = { createAuthController };
