import { readFileSync, writeFileSync } from 'fs'

const rows = JSON.parse(readFileSync('data/supabase_insert.json', 'utf-8'))
const typeIds = {
  case: '88645805-7bf5-4375-9b52-66b7d2d967a5',
  cooler: 'da850209-13af-4352-870c-36c42f6f5893',
  cpu: 'b3e43ecf-2105-4275-aee1-2dda754862d7',
  gpu: 'e41e19b8-a342-461f-9541-fd8930e03604',
  motherboard: 'd2b77fee-3386-433a-a19e-7fb6ada9fabb',
  psu: 'd30b5262-b9a3-4064-a250-6089e8f683de',
  ram: '3645d297-0f28-4043-9ef2-c6ec2ad114a0',
  storage: '411b5ef9-bb7a-4f23-bc83-5d133bab93ad'
}

const escapeSql = (s) => (s ? String(s).replace(/'/g, "''") : null)
const jsonEscape = (obj) => (obj ? JSON.stringify(obj).replace(/'/g, "''") : null)

const getTypeSlug = (name) => {
  const n = name.toLowerCase()
  if (n.includes('ryzen') || n.includes('core') || n.includes('celeron') || n.includes('athlon')) return 'cpu'
  if (n.includes('rtx') || n.includes('radeon') || n.includes('geforce') || n.includes('arc')) return 'gpu'
  if (n.includes('ddr') || n.includes('ram') || n.includes('dimm') || n.includes('so-dimm')) return 'ram'
  if (n.includes('b550') || n.includes('b650') || n.includes('z790') || n.includes('h610') || n.includes('a520') || n.includes('x870') || n.includes('b760') || n.includes('b850') || n.includes('b840') || n.includes('z890') || n.includes('x670') || n.includes('a620') || n.includes('b650') || n.includes('trx')) return 'motherboard'
  if (n.includes(' ssd') || n.includes('hdd') || n.includes('tb') || n.includes('gb') && !n.includes('ddr') && !n.includes('ram') && !n.includes('core') && !n.includes('ryzen')) return 'storage'
  if (n.includes('w') && !n.includes('wd') && !n.includes('be') && !n.includes('power')) return 'psu'
  if (n.includes('cooler') || n.includes('cool') || n.includes('fan') || n.includes('aio') || n.includes('liquid') || n.includes('noctua') || n.includes('deepcool') || n.includes('thermalright') || n.includes('be quiet') || n.includes('lian') || n.includes('corsair') && n.includes('h100') || n.includes('h150') || n.includes('aio')) return 'cooler'
  if (n.includes('case') || n.includes('gabinete') || n.includes('chassis') || n.includes('torre') || n.includes('pc') || n.includes('atx') || n.includes('itx') || n.includes('mid')) return 'case'
  if (n.includes('psu') || n.includes('power supply') || n.includes('fuente')) return 'psu'
  return 'cpu'
}

const values = rows.map((r) => {
  const slug = getTypeSlug(r.name)
  const typeId = typeIds[slug]
  const specs = jsonEscape(r.specs) || "'{}'::jsonb"
  const socket = escapeSql(r.socket)
  const formFactor = escapeSql(r.form_factor)
  const ramType = escapeSql(r.ram_type)
  const chipset = escapeSql(r.chipset)
  const capacityGb = r.capacity_gb || 'NULL'
  const speedMts = r.speed_mts || 'NULL'
  const gpuLenMm = r.gpu_len_mm || 'NULL'
  const psuWatts = r.psu_watts || 'NULL'
  const tdpW = r.tdp_w || 'NULL'
  const interfaceCol = escapeSql(r.interface)
  const imageUrl = escapeSql(r.image_url)

  return `('${escapeSql(r.name)}', '${escapeSql(r.brand)}', '${typeId}', 'USD', ${specs}, ${socket ? `'${socket}'` : 'NULL'}, ${formFactor ? `'${formFactor}'` : 'NULL'}, ${ramType ? `'${ramType}'` : 'NULL'}, ${chipset ? `'${chipset}'` : 'NULL'}, ${capacityGb}, ${speedMts}, ${gpuLenMm}, ${psuWatts}, ${tdpW}, ${interfaceCol ? `'${interfaceCol}'` : 'NULL'}, ${imageUrl ? `'${imageUrl}'` : 'NULL'}, true)`
})

const header = 'INSERT INTO components (name, brand, type_id, price_currency, specs, socket, form_factor, ram_type, chipset, capacity_gb, speed_mts, gpu_len_mm, psu_watts, tdp_w, interface, image_url, is_active) VALUES'
const batchSize = 10
const fs = await import('fs')

for (let i = 0; i < values.length; i += batchSize) {
  const batch = values.slice(i, i + batchSize)
  const batchNum = Math.floor(i / batchSize) + 1
  const batchSql = header + '\n' + batch.join(',\n') + '\nON CONFLICT (name, brand) DO NOTHING;'
  fs.writeFileSync(`data/batch_${batchNum}.sql`, batchSql)
}

const fullSql = header + '\n' + values.join(',\n') + ';'
fs.writeFileSync('data/insert_components.sql', fullSql)
console.log('Batches generados:', Math.ceil(values.length / batchSize))
