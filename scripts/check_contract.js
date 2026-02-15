const hre = require("hardhat");

async function main() {
  const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Dirección actual del Frontend
  
  console.log(`🔍 Buscando contrato en: ${address}`);

  const Hotel = await hre.ethers.getContractFactory("Hotel");
  const hotel = Hotel.attach(address);

  try {
    const owner = await hotel.owner();
    console.log(`✅ ¡Contrato encontrado! Dueño: ${owner}`);
    
    const count = await hotel.roomCount();
    console.log(`📊 Habitaciones: ${count}`);
  } catch (e) {
    console.error("❌ ERROR: No se pudo contactar al contrato. ¿Está desplegado en esta dirección?", e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});