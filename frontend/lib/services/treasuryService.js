import { ethers } from 'ethers';
import { buybackAddress, treasuryAddress, usdcAddress } from '../../config';

export async function getTreasurySnapshot({ provider, contracts }) {
  const c = contracts;
  const [eth, usdc, hw, sw, hb, sb, bb, eng] = await Promise.all([
    provider.getBalance(treasuryAddress),
    c.usdc.balanceOf(treasuryAddress),
    c.treasury.hotelWallet(),
    c.treasury.staffWallet(),
    c.treasury.hotelBps(),
    c.treasury.staffBps(),
    c.treasury.buybackBps(),
    c.buyback.engineBalance(),
  ]);

  return {
    balances: {
      eth: ethers.formatEther(eth),
      usdc: ethers.formatUnits(usdc, 6),
      buybackEngineEth: ethers.formatEther(eng),
    },
    wallets: {
      hotel: hw,
      staff: sw,
    },
    bps: {
      hotel: Number(hb),
      staff: Number(sb),
      buyback: Number(bb),
    }
  };
}

export async function distributeEth({ contracts, amountEth }) {
  const amt = ethers.parseEther(String(amountEth || '0'));
  const tx = await contracts.treasury.distributeETH({ value: amt });
  await tx.wait();
}

export async function distributeUsdc({ contracts, amountUsdc }) {
  const amount = ethers.parseUnits(String(amountUsdc || '0'), 6);
  const ap = await contracts.usdc.approve(treasuryAddress, amount);
  await ap.wait();
  const tx = await contracts.treasury.distributeERC20(usdcAddress, amount);
  await tx.wait();
}

export async function fundBuybackEngine({ signer, amountEth }) {
  const amt = ethers.parseEther(String(amountEth || '0'));
  const tx = await signer.sendTransaction({ to: buybackAddress, value: amt });
  await tx.wait();
}

export async function sellAndBurnRwd({ contracts, amountRwd }) {
  const rwd = ethers.parseUnits(String(amountRwd || '0'), 18);
  const ap = await contracts.rewards.approve(buybackAddress, rwd);
  await ap.wait();
  const tx = await contracts.buyback.sellAndBurn(rwd);
  await tx.wait();
}
