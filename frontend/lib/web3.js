import { ethers } from 'ethers';
import {
  hotelV2Address, hotelV2ABI,
  usdcAddress, usdcABI,
  bookingAddress, bookingABI,
  rewardsAddress, rewardsABI,
  treasuryAddress, treasuryABI,
  govAddress, govABI,
  governorAddress, governorABI,
  timelockAddress, timelockABI,
  buybackAddress, buybackABI,
} from '../config';

export const HARDHAT_CHAIN_ID = '0x7a69';

export async function ensureHardhatNetwork() {
  if (!window?.ethereum) throw new Error('MetaMask no detectado');
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_CHAIN_ID }],
    });
  } catch (e) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: HARDHAT_CHAIN_ID,
          chainName: 'Hardhat Local',
          rpcUrls: ['http://127.0.0.1:8545'],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        }],
      });
      return;
    }
    throw e;
  }
}

export async function connectWallet() {
  if (!window?.ethereum) throw new Error('Instala MetaMask');
  await ensureHardhatNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const account = await signer.getAddress();

  // sanity: verify contracts are deployed (only check V2 + Treasury)
  const code = await provider.getCode(hotelV2Address);
  if (code === '0x') throw new Error('HotelV2 no encontrado. Ejecuta deploy en Hardhat.');

  const contracts = {
    hotelV2: new ethers.Contract(hotelV2Address, hotelV2ABI, signer),
    usdc: new ethers.Contract(usdcAddress, usdcABI, signer),
    booking: new ethers.Contract(bookingAddress, bookingABI, signer),
    rewards: new ethers.Contract(rewardsAddress, rewardsABI, signer),
    treasury: new ethers.Contract(treasuryAddress, treasuryABI, signer),
    gov: new ethers.Contract(govAddress, govABI, signer),
    governor: new ethers.Contract(governorAddress, governorABI, signer),
    timelock: new ethers.Contract(timelockAddress, timelockABI, signer),
    buyback: new ethers.Contract(buybackAddress, buybackABI, signer),
  };

  return { provider, signer, account, contracts };
}

export function shortAddr(a) {
  if (!a) return '';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
