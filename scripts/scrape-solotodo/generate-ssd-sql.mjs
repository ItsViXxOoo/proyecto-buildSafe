/**
 * Genera el SQL de siembra de SSDs desde data/ssds_scraped.json.
 * - Conversión CLP->USD con la tasa del pipeline existente (USD_CLP_RATE = 950)
 * - performance_tier por quintil de precio (convención de la BD: 5 buckets por type)
 * - ON CONFLICT (name, brand) DO UPDATE (idempotente, igual que generate-sql.mjs)
 * Output: data/batch_ssd_N.sql
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const HERE = dirname(fileURLToPath(import.meta.url))
const STORAGE_TYPE_ID = '411b5ef9-bb7a-4f23-bc83-5d133bab93ad'
const USD_CLP_RATE = 950

const rows = JSON.parse(readFileSync(join(HERE, 'data', 'ssds_scraped.json'), 'utf-8'))

// Normalización de marcas (varias prendas escritas desde el nombre)
const brandFix = (b) => {
  const x = String(b).trim()
  if (/^a-?data$/i.test(x)) return 'ADATA'
  if (/^sk$/i.test(x)) return 'SK Hynix'
  if (/^wd$/i.test(x)) return 'Western Digital'
  return x
}

const escapeSql = (s) => (s ? String(s).replace(/'/g, "''") : null)
const jsonb = (obj) => (obj ? `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb` : `'{}'::jsonb`)

// Por precio USD, quintiles -> tier 1..5 (menor precio = tier 1)
const withUSD = rows.map((r) => ({ ...r, brand: brandFix(r.brand), priceUSD: Math.round(r.priceCLP / USD_CLP_RATE) }))
  .sort((a, b) => a.priceUSD - b.priceUSD)
const quintil = Math.ceil(withUSD.length / 5)
withUSD.forEach((r, i) => { r.tier = Math.min(5, Math.floor(i / quintil) + 1) })

const specsCompact = (r) => {
  const out = {}
  const s = r.specs || {}
  for (const k of ['type_name', 'interface', 'bus_unicode', 'storage_format', 'dram', 'nand']) {
    if (s[k] !== undefined && s[k] !== null && s[k] !== '') out[k] = s[k]
  }
  return out
}

const batch = withUSD.map((r) => {
  const s = jsonb(specsCompact(r))
  const cap = r.capacityGb
  const img = r.imageUrl ? `'${escapeSql(r.imageUrl)}'` : 'NULL'
  return `('${escapeSql(r.name)}', '${escapeSql(r.brand)}', '${STORAGE_TYPE_ID}', 'USD', ${s}, ${cap}, NULL, NULL, ${img}, ${r.priceUSD}, true, ${r.tier})`
})

const header = "INSERT INTO components (name, brand, type_id, price_currency, specs, capacity_gb, gpu_len_mm, max_gpu_len_mm, image_url, current_price, is_active, performance_tier) VALUES"
const batchSize = 50
for (let i = 0; i < batch.length; i += batchSize) {
  const n = Math.floor(i / batchSize) + 1
  const b = batch.slice(i, i + batchSize)
  const sql = header + '\n' + b.join(',\n') +
    `\nON CONFLICT (name, brand) DO UPDATE SET specs = EXCLUDED.specs, capacity_gb = EXCLUDED.capacity_gb, image_url = EXCLUDED.image_url, current_price = EXCLUDED.current_price, performance_tier = EXCLUDED.performance_tier, is_active = true;`
  writeFileSync(join(HERE, 'data', `batch_ssd_${n}.sql`), sql)
}
console.log(`Batches: ${Math.ceil(batch.length / batchSize)}, filas: ${batch.length}`)
console.log('Muestra tier 1:', JSON.stringify(withUSD.slice(0, 3).map((r) => [r.name, r.priceUSD, r.tier])))
console.log('Muestra tier 5:', JSON.stringify(withUSD.slice(-3).map((r) => [r.name, r.priceUSD, r.tier])))
