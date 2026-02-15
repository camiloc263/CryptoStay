const { wrap } = require('./wrap');

function createWeb3Controller({ web3ConfigService }) {
  return {
    config: wrap(async (_req, res) => {
      const cfg = web3ConfigService.getConfig();
      res.json(cfg);
    })
  };
}

module.exports = { createWeb3Controller };
