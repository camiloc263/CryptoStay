import addresses from './contracts/contract-address.json';

import hotelArtifact from './contracts/Hotel.json';
import hotelV2Artifact from './contracts/HotelV2.json';
import usdcArtifact from './contracts/MockUSDC.json';
import sbtArtifact from './contracts/MembershipSBT.json';
import bookingArtifact from './contracts/BookingNFT.json';
import rewardsArtifact from './contracts/RewardsToken.json';
import treasuryArtifact from './contracts/Treasury.json';
import govArtifact from './contracts/GovToken.json';
import governorArtifact from './contracts/HotelGovernor.json';
import timelockArtifact from './contracts/TimelockController.json';
import buybackArtifact from './contracts/BuybackEngine.json';

// Deployed addresses (Hardhat local)
export const hotelAddress = addresses.hotelAddress;
export const hotelV2Address = addresses.hotelV2Address;
export const usdcAddress = addresses.usdcAddress;
export const sbtAddress = addresses.sbtAddress;
export const bookingAddress = addresses.bookingAddress;
export const rewardsAddress = addresses.rewardsAddress;
export const treasuryAddress = addresses.treasuryAddress;
export const govAddress = addresses.govAddress;
export const governorAddress = addresses.governorAddress;
export const timelockAddress = addresses.timelockAddress;
export const buybackAddress = addresses.buybackAddress;

export const hotelABI = hotelArtifact.abi;
export const hotelV2ABI = hotelV2Artifact.abi;
export const usdcABI = usdcArtifact.abi;
export const sbtABI = sbtArtifact.abi;
export const bookingABI = bookingArtifact.abi;
export const rewardsABI = rewardsArtifact.abi;
export const treasuryABI = treasuryArtifact.abi;
export const govABI = govArtifact.abi;
export const governorABI = governorArtifact.abi;
export const timelockABI = timelockArtifact.abi;
export const buybackABI = buybackArtifact.abi;

/*
  Estos archivos se generan/actualizan con:
    npx hardhat run scripts/deploy.js --network localhost

  - frontend/contracts/contract-address.json (hotelAddress/usdcAddress/sbtAddress)
  - frontend/contracts/*.json (artifacts con ABI real)
*/
