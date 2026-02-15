window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.sessionGate = (function(){
  function requireSession({ onMissing } = {}){
    const sess = HotelSys.core?.session?.get?.();
    if (!sess) {
      onMissing && onMissing();
      return null;
    }
    return sess;
  }

  return { requireSession };
})();
