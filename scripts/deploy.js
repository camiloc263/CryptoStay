import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // 1) Deploy MockUSDC
  const MockUSDC = await hre.ethers.getContractFactory('MockUSDC');
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log('🪙 MockUSDC desplegado en:', usdcAddress);

  // 2) Deploy MembershipSBT
  const MembershipSBT = await hre.ethers.getContractFactory('MembershipSBT');
  const sbt = await MembershipSBT.deploy();
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log('🎫 MembershipSBT desplegado en:', sbtAddress);

  // 3) Deploy legacy Hotel (v1) to keep current demo working
  const Hotel = await hre.ethers.getContractFactory('Hotel');
  const hotel = await Hotel.deploy(usdcAddress);
  await hotel.waitForDeployment();
  const hotelAddress = await hotel.getAddress();
  console.log('🏨 Hotel v1 desplegado en:', hotelAddress);

  // --- Web3 5-points MVP ---
  // 4) RewardsToken + BookingNFT
  const RewardsToken = await hre.ethers.getContractFactory('RewardsToken');
  const rewards = await RewardsToken.deploy(deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log('🏅 RewardsToken desplegado en:', rewardsAddress);

  const BookingNFT = await hre.ethers.getContractFactory('BookingNFT');
  const booking = await BookingNFT.deploy(deployer.address);
  await booking.waitForDeployment();
  const bookingAddress = await booking.getAddress();
  console.log('🧾 BookingNFT desplegado en:', bookingAddress);

  // 5) Treasury (splits: 60/30/10)
  // Demo wallets: deployer as hotel, account #1 as staff
  const staffWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const Treasury = await hre.ethers.getContractFactory('Treasury');
  const treasury = await Treasury.deploy(deployer.address, deployer.address, staffWallet);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log('🏦 Treasury desplegado en:', treasuryAddress);

  // 5.1) BuybackEngine (fixed price demo)
  // price: 0.000001 ETH per 1 RWD
  const BuybackEngine = await hre.ethers.getContractFactory('BuybackEngine');
  const weiPerRwd = hre.ethers.parseEther('0.000001');
  const buyback = await BuybackEngine.deploy(deployer.address, rewardsAddress, weiPerRwd);
  await buyback.waitForDeployment();
  const buybackAddress = await buyback.getAddress();
  console.log('🔥 BuybackEngine desplegado en:', buybackAddress);

  // 6) HotelV2 (payments -> treasury + booking receipt + rewards)
  const HotelV2 = await hre.ethers.getContractFactory('HotelV2');
  const hotelV2 = await HotelV2.deploy(deployer.address, usdcAddress, bookingAddress, rewardsAddress, treasuryAddress, sbtAddress);
  await hotelV2.waitForDeployment();
  const hotelV2Address = await hotelV2.getAddress();
  console.log('🏨 HotelV2 desplegado en:', hotelV2Address);

  // Transfer minting authority
  await (await booking.transferOwnership(hotelV2Address)).wait();
  await (await rewards.transferOwnership(hotelV2Address)).wait();

  // 7) Governance (GovToken + Timelock + Governor)
  const GovToken = await hre.ethers.getContractFactory('GovToken');
  const gov = await GovToken.deploy(deployer.address);
  await gov.waitForDeployment();
  const govAddress = await gov.getAddress();
  console.log('🗳️ GovToken desplegado en:', govAddress);

  const Timelock = await hre.ethers.getContractFactory('TimelockController');
  const minDelay = 1; // demo
  const proposers = [deployer.address];
  const executors = [hre.ethers.ZeroAddress]; // anyone
  const timelock = await Timelock.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log('⏳ Timelock desplegado en:', timelockAddress);

  const HotelGovernor = await hre.ethers.getContractFactory('HotelGovernor');
  const governor = await HotelGovernor.deploy(govAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log('🏛️ Governor desplegado en:', governorAddress);

  // Give timelock ownership of treasury + hotelV2 (so governance can change params)
  await (await treasury.transferOwnership(timelockAddress)).wait();
  await (await hotelV2.transferOwnership(timelockAddress)).wait();

  // 8) Save files for frontend
  saveFrontendFiles({
    hotelAddress,
    hotelV2Address,
    usdcAddress,
    sbtAddress,
    bookingAddress,
    rewardsAddress,
    treasuryAddress,
    buybackAddress,
    govAddress,
    timelockAddress,
    governorAddress
  }, ['Hotel', 'HotelV2', 'MockUSDC', 'MembershipSBT', 'BookingNFT', 'RewardsToken', 'Treasury', 'BuybackEngine', 'GovToken', 'HotelGovernor', 'TimelockController']);
}

function saveFrontendFiles(addresses, names) {
  const contractsDir = path.join(__dirname, '..', 'frontend', 'contracts');
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  fs.writeFileSync(
    path.join(contractsDir, 'contract-address.json'),
    JSON.stringify(addresses, undefined, 2)
  );

  for (const name of names) {
    const artifact = hre.artifacts.readArtifactSync(name);
    fs.writeFileSync(
      path.join(contractsDir, `${name}.json`),
      JSON.stringify(artifact, undefined, 2)
    );
  }

  console.log(`✅ Archivos generados en: ${contractsDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});