function createAuthService({ usersRepo }) {
  return {
    async login({ usuario, password }) {
      if (!usuario || !password) {
        const err = new Error('usuario y password son requeridos');
        err.status = 400;
        throw err;
      }

      const user = await usersRepo.findByCredentials({ usuario, password });
      if (!user) {
        const err = new Error('Credenciales incorrectas');
        err.status = 401;
        throw err;
      }

      return { id: user.id, usuario: user.usuario, rol: user.rol };
    },

    async register({ usuario, password, email, nombre, apellido, rol = 'huesped' }) {
      const u = String(usuario || '').trim();
      const p = String(password || '').trim();
      const e = String(email || '').trim().toLowerCase();
      const n = String(nombre || '').trim();
      const a = String(apellido || '').trim();
      const r = String(rol || 'huesped').trim().toLowerCase();

      if (!u || !p || !e || !n || !a) {
        const err = new Error('usuario, password, email, nombre y apellido son requeridos');
        err.status = 400;
        throw err;
      }

      if (u.length < 3) {
        const err = new Error('El usuario debe tener al menos 3 caracteres');
        err.status = 400;
        throw err;
      }

      if (p.length < 4) {
        const err = new Error('La contraseña debe tener al menos 4 caracteres');
        err.status = 400;
        throw err;
      }

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      if (!emailOk) {
        const err = new Error('Correo electrónico inválido');
        err.status = 400;
        throw err;
      }

      if (n.length < 2) {
        const err = new Error('El nombre debe tener al menos 2 caracteres');
        err.status = 400;
        throw err;
      }

      if (a.length < 2) {
        const err = new Error('El apellido debe tener al menos 2 caracteres');
        err.status = 400;
        throw err;
      }

      // MVP: solo permitimos registro de huésped
      if (r !== 'huesped') {
        const err = new Error('Solo se permite registrar huéspedes');
        err.status = 400;
        throw err;
      }

      const existsU = await usersRepo.findByUsuario({ usuario: u });
      if (existsU) {
        const err = new Error('Ese usuario ya existe');
        err.status = 409;
        throw err;
      }

      // If schema supports email, check for duplicates
      try {
        const cols = await usersRepo._getColumns?.();
        if (Array.isArray(cols) && cols.includes('email')) {
          const existsE = await usersRepo.findByEmail({ email: e });
          if (existsE) {
            const err = new Error('Ese correo ya está registrado');
            err.status = 409;
            throw err;
          }
        }
      } catch {}

      return usersRepo.createUser({ usuario: u, password: p, rol: r, email: e, nombre: n, apellido: a });
    }
  };
}

module.exports = { createAuthService };
