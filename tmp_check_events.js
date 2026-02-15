const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

(async()=>{
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname,'frontend','contracts','contract-address.json'),'utf8'));
  const art = JSON.parse(fs.readFileSync(path.join(__dirname,'frontend','contracts','HotelV2.json'),'utf8'));
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const c = new ethers.Contract(cfg.hotelV2Address, art.abi, provider);

  const latest = await provider.getBlockNumber();
  const from = Math.max(0, latest - 500);

  const logsEth = await c.queryFilter(c.filters.ReservaPagada(), from, latest);
  const logsUsdc = await c.queryFilter(c.filters.ReservaPagadaUSDC(), from, latest);

  console.log({ latest, from, ethEvents: logsEth.length, usdcEvents: logsUsdc.length });
  if (logsEth.length) console.log('lastEth', logsEth.at(-1).args);
  if (logsUsdc.length) console.log('lastUsdc', logsUsdc.at(-1).args);
})().catch((e)=>{ console.error(e); process.exitCode=1; });
