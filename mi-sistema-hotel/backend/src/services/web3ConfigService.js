const fs = require('fs');
const path = require('path');

function createWeb3ConfigService({ contractsDir }) {
  return {
    getConfig() {
      const addressJson = JSON.parse(fs.readFileSync(path.join(contractsDir, 'contract-address.json'), 'utf8'));

      const hotelArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'Hotel.json'), 'utf8'));
      const hotelV2Artifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'HotelV2.json'), 'utf8'));
      const usdcArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'MockUSDC.json'), 'utf8'));
      const sbtArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'MembershipSBT.json'), 'utf8'));

      // 5-points MVP artifacts
      const bookingArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'BookingNFT.json'), 'utf8'));
      const rewardsArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'RewardsToken.json'), 'utf8'));
      const treasuryArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'Treasury.json'), 'utf8'));
      const govArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'GovToken.json'), 'utf8'));
      const governorArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'HotelGovernor.json'), 'utf8'));
      const timelockArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, 'TimelockController.json'), 'utf8'));

      return {
        // legacy v1
        hotelAddress: addressJson.hotelAddress,
        hotelABI: hotelArtifact.abi,

        // v2 (recommended)
        hotelV2Address: addressJson.hotelV2Address,
        hotelV2ABI: hotelV2Artifact.abi,

        // tokens
        usdcAddress: addressJson.usdcAddress,
        usdcABI: usdcArtifact.abi,
        sbtAddress: addressJson.sbtAddress,
        sbtABI: sbtArtifact.abi,

        // 5 points
        bookingAddress: addressJson.bookingAddress,
        bookingABI: bookingArtifact.abi,
        rewardsAddress: addressJson.rewardsAddress,
        rewardsABI: rewardsArtifact.abi,
        treasuryAddress: addressJson.treasuryAddress,
        treasuryABI: treasuryArtifact.abi,

        // governance
        govAddress: addressJson.govAddress,
        govABI: govArtifact.abi,
        timelockAddress: addressJson.timelockAddress,
        timelockABI: timelockArtifact.abi,
        governorAddress: addressJson.governorAddress,
        governorABI: governorArtifact.abi,
      };
    }
  };
}

module.exports = { createWeb3ConfigService };
