window.HotelSys = window.HotelSys || {};
HotelSys.ui = HotelSys.ui || {};

HotelSys.ui.chatbotWidget = (function(){
  const clients = HotelSys.core?.clients;
  let isOpen = false;

  const CSS = `
    .hs-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif; }
    .hs-chat-btn {
      width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.2s;
    }
    .hs-chat-btn:hover { transform: scale(1.05); }
    .hs-chat-window {
      position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px;
      background: #1e293b; border: 1px solid #334155; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5); display: flex; flex-direction: column;
      overflow: hidden; opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s;
    }
    .hs-chat-window.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .hs-chat-head { padding: 15px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .hs-chat-title { color: #f8fafc; font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    .hs-chat-close { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; }
    .hs-chat-body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .hs-msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
    .hs-msg-bot { background: #334155; color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
    .hs-msg-user { background: #6366f1; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
    .hs-chat-input-area { padding: 10px; border-top: 1px solid #334155; background: #0f172a; display: flex; gap: 10px; }
    .hs-chat-input { flex: 1; background: #1e293b; border: 1px solid #334155; color: white; padding: 10px; border-radius: 20px; outline: none; }
    .hs-chat-send { background: #6366f1; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
    .hs-typing { font-size: 12px; color: #94a3b8; margin-left: 10px; display: none; }
  `;

  function injectCSS() {
    if (document.getElementById('hs-chat-css')) return;
    const s = document.createElement('style');
    s.id = 'hs-chat-css';
    s.innerHTML = CSS;
    document.head.appendChild(s);
  }

  function create() {
    injectCSS();
    const div = document.createElement('div');
    div.className = 'hs-chat-widget';
    div.innerHTML = `
      <div class="hs-chat-window" id="hs-chat-win">
        <div class="hs-chat-head">
          <div class="hs-chat-title"><i class="fa-solid fa-robot"></i> Asistente Web3</div>
          <button class="hs-chat-close" id="hs-chat-x"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="hs-chat-body" id="hs-chat-log">
          <div class="hs-msg hs-msg-bot">Hola, soy tu asistente virtual. Pregúntame sobre reservas, pagos con criptomonedas (ETH/USDC) o disponibilidad.</div>
        </div>
        <div class="hs-typing" id="hs-chat-typing">Escribiendo...</div>
        <form class="hs-chat-input-area" id="hs-chat-form">
          <input type="text" class="hs-chat-input" id="hs-chat-in" placeholder="Escribe tu pregunta..." autocomplete="off">
          <button type="submit" class="hs-chat-send"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
      <button class="hs-chat-btn" id="hs-chat-toggle">
        <i class="fa-solid fa-comment-dots"></i>
      </button>
    `;
    document.body.appendChild(div);

    // Events
    const win = div.querySelector('#hs-chat-win');
    const toggle = div.querySelector('#hs-chat-toggle');
    const close = div.querySelector('#hs-chat-x');
    const form = div.querySelector('#hs-chat-form');
    const input = div.querySelector('#hs-chat-in');
    const log = div.querySelector('#hs-chat-log');
    const typing = div.querySelector('#hs-chat-typing');

    const toggleOpen = () => {
      isOpen = !isOpen;
      win.classList.toggle('open', isOpen);
      if (isOpen) setTimeout(() => input.focus(), 100);
    };

    toggle.addEventListener('click', toggleOpen);
    close.addEventListener('click', toggleOpen);

    const addMsg = (text, isUser) => {
      const d = document.createElement('div');
      d.className = `hs-msg ${isUser ? 'hs-msg-user' : 'hs-msg-bot'}`;
      d.innerText = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const txt = input.value.trim();
      if (!txt) return;
      
      addMsg(txt, true);
      input.value = '';
      typing.style.display = 'block';

      try {
        const res = await clients.api.post('/chat', { query: txt });
        typing.style.display = 'none';
        addMsg(res.text || 'No entendí bien, intenta reformular.', false);
      } catch (err) {
        typing.style.display = 'none';
        addMsg('Error de conexión con el asistente.', false);
      }
    });
  }

  return { init: create };
})();
