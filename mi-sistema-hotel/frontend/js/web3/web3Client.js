window.HotelSys = window.HotelSys || {};
HotelSys.web3 = HotelSys.web3 || {};

HotelSys.web3.ensureHardhatNetwork = async function ensureHardhatNetwork(){
  if (!window.ethereum) throw new Error('MetaMask no está disponible');
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7a69' }] });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x7a69',
          chainName: 'Hardhat Local',
          rpcUrls: ['http://127.0.0.1:8545'],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        }],
      });
    } else {
      throw e;
    }
  }
};

HotelSys.web3.isUserRejected = function isUserRejected(e){
  const code = e?.info?.error?.code ?? e?.code;
  const msg = String(e?.info?.error?.message || e?.shortMessage || e?.message || '').toLowerCase();
  return code === 4001 || msg.includes('user denied') || msg.includes('rejected') || msg.includes('denied');
};

HotelSys.web3.payWithETH = async function payWithETH({ reservaId, amountEth, web3cfg }){
  try {
    await HotelSys.web3.ensureHardhatNetwork();
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const provider = new window.ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const hotel = new window.ethers.Contract(web3cfg.hotelAddress, web3cfg.hotelABI, signer);

    const value = window.ethers.parseEther(String(amountEth || 0));
    if (value === 0n) {
      throw new Error('Monto inválido (0). Verifica noches/precio y la tasa antes de pagar.');
    }

    const tx = await hotel.pagarReserva(String(reservaId), { value });
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (e) {
    const code = e?.info?.error?.code ?? e?.code;
    const msg = String(e?.info?.error?.message || e?.shortMessage || e?.message || '').toLowerCase();

    // Don't treat every -32603 as RPC down: estimateGas reverts often bubble up as -32603.
    const isRpcDown = msg.includes('failed to fetch')
      || msg.includes('rpc endpoint returned too many errors')
      || msg.includes('too many errors')
      || msg.includes('could not connect')
      || msg.includes('network error')
      || code === -32002;

    if (isRpcDown) {
      const err = new Error('No se pudo conectar al RPC local (Hardhat). Verifica que hardhat node esté encendido en http://127.0.0.1:8545 y que MetaMask esté en la red Hardhat Local.');
      err.code = 'RPC_DOWN';
      throw err;
    }
    throw e;
  }
};

HotelSys.web3.payWithUSDC = async function payWithUSDC({ reservaId, amountUsdc, web3cfg }){
  try {
    await HotelSys.web3.ensureHardhatNetwork();
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const provider = new window.ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const usdc = new window.ethers.Contract(web3cfg.usdcAddress, web3cfg.usdcABI, signer);
    const hotel = new window.ethers.Contract(web3cfg.hotelAddress, web3cfg.hotelABI, signer);

    const amount = window.ethers.parseUnits(String(amountUsdc), 6);
    if (amount === 0n) {
      throw new Error('Monto inválido (0). Verifica noches/precio y la tasa antes de pagar.');
    }

    const tx1 = await usdc.approve(web3cfg.hotelAddress, amount);
    await tx1.wait();

    const tx2 = await hotel.pagarReservaUSDC(String(reservaId), amount);
    const receipt = await tx2.wait();
    return receipt.hash;
  } catch (e) {
    const code = e?.info?.error?.code ?? e?.code;
    const msg = String(e?.info?.error?.message || e?.shortMessage || e?.message || '').toLowerCase();

    // Don't treat every -32603 as RPC down: estimateGas reverts often bubble up as -32603.
    const isRpcDown = msg.includes('failed to fetch')
      || msg.includes('rpc endpoint returned too many errors')
      || msg.includes('too many errors')
      || msg.includes('could not connect')
      || msg.includes('network error')
      || code === -32002;

    if (isRpcDown) {
      const err = new Error('No se pudo conectar al RPC local (Hardhat). Verifica que hardhat node esté encendido en http://127.0.0.1:8545 y que MetaMask esté en la red Hardhat Local.');
      err.code = 'RPC_DOWN';
      throw err;
    }
    throw e;
  }
};
