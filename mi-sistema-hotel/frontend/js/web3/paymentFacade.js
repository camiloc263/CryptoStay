window.HotelSys = window.HotelSys || {};
HotelSys.web3 = HotelSys.web3 || {};

/**
 * SOLID: Facade for payments. UI should call this, not interact with ethers contracts directly.
 */
HotelSys.web3.paymentFacade = (function(){
  const clients = HotelSys.core?.clients;

  async function getSelectedHotel(){
    const cfg = await clients.web3.getConfig();
    const sel = HotelSys.web3.selectHotelContract(cfg);
    return { cfg, sel };
  }

  async function payETH({ reservaId, amountEth }){
    const { cfg, sel } = await getSelectedHotel();
    // call using shared web3 client
    return HotelSys.web3.payWithETH({
      reservaId,
      amountEth,
      web3cfg: { ...cfg, hotelAddress: sel.address, hotelABI: sel.abi }
    });
  }

  async function payUSDC({ reservaId, amountUsdc }){
    const { cfg, sel } = await getSelectedHotel();
    return HotelSys.web3.payWithUSDC({
      reservaId,
      amountUsdc,
      web3cfg: { ...cfg, hotelAddress: sel.address, hotelABI: sel.abi }
    });
  }

  return { payETH, payUSDC, getSelectedHotel };
})();
