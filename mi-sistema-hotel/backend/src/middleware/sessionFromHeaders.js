function sessionFromHeaders(req, _res, next) {
  const id = req.header('x-hs-user-id');
  const rol = req.header('x-hs-role');
  const usuario = req.header('x-hs-user');

  if (id) {
    req.user = {
      id: Number(id),
      rol: rol || null,
      usuario: usuario || null,
    };
  }

  next();
}

module.exports = { sessionFromHeaders };
