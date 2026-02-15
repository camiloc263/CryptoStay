function createChatbotService({ web3ConfigService, habitacionesRepo }) {
  // Simple heuristic AI for MVP (can be replaced by LLM adapter later)
  const RESPONSES = [
    {
      keywords: ['pagar', 'pago', 'wallet', 'billetera', 'metamask', 'crypto'],
      text: "Para pagar con Web3: 1) Conecta tu MetaMask. 2) Ve a 'Mis Reservas'. 3) Selecciona la reserva pendiente. 4) Elige ETH o mUSDC. El sistema interactuará directamente con el Smart Contract del hotel."
    },
    {
      keywords: ['precio', 'costo', 'valor', 'cuanto cuesta'],
      text: "Los precios varían según la habitación. La Simple está alrededor de 150k COP y la Suite 245k COP. Aceptamos pagos en cripto (ETH/USDC) convertidos a la tasa del día."
    },
    {
      keywords: ['cancelar', 'anular'],
      text: "Puedes cancelar tu reserva gratuitamente desde la sección 'Mis Reservas' si aún no ha pasado la fecha de check-in."
    },
    {
      keywords: ['contrato', 'address', 'direccion'],
      async resolve() {
        const cfg = await web3ConfigService.getConfig();
        return `El contrato del HotelV2 está desplegado en: ${cfg.hotelV2Address || cfg.hotelAddress}. Puedes verificarlo en el explorador de bloques local.`;
      }
    },
    {
      keywords: ['disponible', 'reservar'],
      text: "Puedes ver las habitaciones disponibles filtrando por 'Disponibles' en el panel principal. Haz clic en una tarjeta para iniciar el proceso."
    }
  ];

  return {
    async processQuery({ query, userContext }) {
      const q = String(query || '').toLowerCase();
      
      // 1. Find matching heuristic
      for (const r of RESPONSES) {
        if (r.keywords.some(k => q.includes(k))) {
          if (r.resolve) return { text: await r.resolve() };
          return { text: r.text };
        }
      }

      // 2. Default fallback
      return { 
        text: `Hola ${userContext?.usuario || 'viajero'}. Soy tu asistente Web3. Puedo ayudarte con pagos, reservas o información del contrato inteligente. ¿En qué te ayudo?` 
      };
    }
  };
}

module.exports = { createChatbotService };
