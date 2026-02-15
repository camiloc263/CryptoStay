function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      const status = e.status || 500;
      res.status(status).json({ error: e.message || 'Error', details: status === 500 ? String(e) : undefined });
    }
  };
}

module.exports = { wrap };
