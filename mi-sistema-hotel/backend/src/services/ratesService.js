function createRatesService() {
  // Demo: sin API externa (se puede reemplazar por un provider)
  const rates = {
    usd_cop: 4000,
    eth_usd: 2500
  };

  return {
    getRates() {
      return rates;
    },
    setRates(patch) {
      if (patch?.usd_cop) rates.usd_cop = Number(patch.usd_cop);
      if (patch?.eth_usd) rates.eth_usd = Number(patch.eth_usd);
      return rates;
    }
  };
}

module.exports = { createRatesService };
