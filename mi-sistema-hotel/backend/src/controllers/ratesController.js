const { wrap } = require('./wrap');

function createRatesController({ ratesService }) {
  return {
    get: wrap(async (_req, res) => {
      res.json(ratesService.getRates());
    })
  };
}

module.exports = { createRatesController };
