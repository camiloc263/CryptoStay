window.HotelSys = window.HotelSys || {};
HotelSys.web3 = HotelSys.web3 || {};

/**
 * SOLID: Single responsibility selector to pick correct Hotel contract (v2 preferred).
 */
HotelSys.web3.selectHotelContract = function selectHotelContract(web3cfg){
  if (web3cfg?.hotelV2Address && web3cfg?.hotelV2ABI) {
    return { address: web3cfg.hotelV2Address, abi: web3cfg.hotelV2ABI, version: 'v2' };
  }
  return { address: web3cfg.hotelAddress, abi: web3cfg.hotelABI, version: 'v1' };
};
