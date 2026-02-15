/* Smoke tests (API) for HotelSys
   Run: node backend/scripts/smoke.js
*/

const API = 'http://127.0.0.1:3000/api';

function assert(cond, msg){
  if(!cond){
    const e = new Error(`ASSERT: ${msg}`);
    e.isAssert = true;
    throw e;
  }
}

async function j(method, path, body){
  const r = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if(!r.ok){
    const e = new Error(`HTTP ${r.status} ${method} ${path}: ${data?.error || data?.mensaje || JSON.stringify(data)}`);
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

async function uploadFotos(numero, { files, replace=true, old_numero=null }){
  const fd = new FormData();
  if(replace) fd.append('replace','1');
  if(old_numero) fd.append('old_numero', String(old_numero));
  for(const f of files){
    fd.append('fotos', f.blob, f.name);
  }

  const r = await fetch(`${API}/habitaciones/${encodeURIComponent(numero)}/fotos`, { method: 'POST', body: fd });
  const data = await r.json().catch(() => ({}));
  if(!r.ok){
    const e = new Error(`HTTP ${r.status} upload fotos: ${data?.error || data?.mensaje || JSON.stringify(data)}`);
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

function fakePngBytes(){
  // not a real PNG but good enough to test upload plumbing
  return new Uint8Array([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, 0x00,0x00,0x00,0x00]);
}

async function main(){
  console.log('Smoke: start');

  // 1) basic endpoints
  const rates = await j('GET','/rates');
  assert(rates.eth_usd && rates.usd_cop, 'rates should include eth_usd + usd_cop');
  console.log('✓ GET /rates');

  const web3 = await j('GET','/web3/config');
  assert(web3.hotelAddress || web3.hotelV2Address, 'web3 config should include hotelAddress or hotelV2Address');
  console.log('✓ GET /web3/config');

  const beforeRooms = await j('GET','/habitaciones');
  assert(Array.isArray(beforeRooms), 'habitaciones should be array');
  console.log(`✓ GET /habitaciones (${beforeRooms.length})`);

  // 2) create room with price
  const numero = String(900 + Math.floor(Math.random()*90));
  await j('POST','/habitaciones/crear', { numero, tipo: 'Simple', precio_cop: 123456 });
  console.log(`✓ POST /habitaciones/crear (${numero})`);

  let rooms = await j('GET','/habitaciones');
  const created = rooms.find(r => String(r.numero) === numero);
  assert(created, 'created room should exist');
  assert(Number(created.precio_cop) === 123456, 'created room should store precio_cop');
  console.log('✓ precio_cop persisted');

  // 3) upload photos replace
  const f1 = { name: 'a.png', blob: new Blob([fakePngBytes()], { type: 'image/png' }) };
  const up1 = await uploadFotos(numero, { files:[f1], replace:true });
  assert(Array.isArray(up1.urls) && up1.urls.length === 1, 'upload should return urls[1]');
  console.log('✓ POST /habitaciones/:numero/fotos (replace)');

  // 4) url is reachable
  const url = `http://127.0.0.1:3000${up1.urls[0]}`;
  const rImg = await fetch(url);
  assert(rImg.ok, `uploaded file should be reachable: ${url}`);
  console.log('✓ GET /uploads/<file>');

  // 5) list includes fotos
  rooms = await j('GET','/habitaciones');
  const withFotos = rooms.find(r => String(r.numero) === numero);
  assert(Array.isArray(withFotos.fotos) && withFotos.fotos.length >= 1, 'habitacion should include fotos array');
  console.log('✓ habitaciones includes fotos[]');

  // 6) update room price and number, then replace fotos with old_numero
  const newNumero = `${numero}A`; // varchar(10)
  await j('PUT',`/habitaciones/${created.id}`, { numero: newNumero, tipo: 'Suite', precio_cop: 777000 });
  console.log('✓ PUT /habitaciones/:id (numero/tipo/precio_cop)');

  const f2 = { name: 'b.png', blob: new Blob([fakePngBytes()], { type: 'image/png' }) };
  const up2 = await uploadFotos(newNumero, { files:[f2], replace:true, old_numero: numero });
  assert(up2.replaced === true, 'replace flag should be true');
  console.log('✓ replace photos with old_numero');

  rooms = await j('GET','/habitaciones');
  const updated = rooms.find(r => String(r.numero) === newNumero);
  assert(updated && Number(updated.precio_cop) === 777000, 'updated room should reflect changes');
  assert(updated.fotos?.length >= 1, 'updated room should have fotos');

  const oldStill = rooms.find(r => String(r.numero) === numero);
  assert(!oldStill, 'old numero should not exist after update');
  console.log('✓ update reflected in list');

  // 7) delete room
  await j('DELETE', `/habitaciones/${created.id}`);
  rooms = await j('GET','/habitaciones');
  assert(!rooms.find(r => Number(r.id) === Number(created.id)), 'deleted room should not exist');
  console.log('✓ DELETE /habitaciones/:id');

  console.log('Smoke: OK');
}

main().catch((e) => {
  console.error('\nSmoke: FAIL');
  console.error(e.stack || e.message || e);
  process.exitCode = 1;
});
