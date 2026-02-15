window.HotelSys = window.HotelSys || {};
HotelSys.utils = HotelSys.utils || {};

HotelSys.utils.fmtCOP = function fmtCOP(n){
  try { return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n); }
  catch { return `$${Number(n||0).toLocaleString('es-CO')} COP`; }
};

HotelSys.utils.fmtUSD = function fmtUSD(n){
  try { return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n); }
  catch { return `$${Number(n||0).toFixed(2)} USD`; }
};

HotelSys.utils.qs = function qs(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
};
