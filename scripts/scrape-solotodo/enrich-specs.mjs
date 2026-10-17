import { readFileSync, writeFileSync, existsSync } from 'fs'
import fetch from 'node-fetch'

const INPUT = 'data/output.json'
const OUTPUT = 'data/supabase_insert.json'
const PROGRESS = 'data/enrich_progress.json'
const CONCURRENCY = 4
const DELAY_MS = 250
const MAX_RETRIES = 2

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function productIdFromImageUrl(url) {
  if (!url) return null
  const m = String(url).match(/\/products\/(\d+)\//)
  return m ? m[1] : null
}

function num(v) {
  if (v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function str(v) {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s ? s : undefined
}

// Compacta specs del API: solo escalares, sin ids internos
function compactSpecs(specs) {
  const out = {}
  if (!specs || typeof specs !== 'object') return out
  for (const [k, v] of Object.entries(specs)) {
    if (/(_id|^id)$/i.test(k)) continue
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[k] = v
      if (Object.keys(out).length >= 40) break
    }
  }
  return out
}

function mapRow(base, api) {
  const specs = api.specs && typeof api.specs === 'object' ? api.specs : {}
  const brand = base.brand && base.brand !== 'Unknown'
    ? base.brand
    : (api.brand && api.brand.name) || base.brand || 'Unknown'

  // Precio: mínimo offer_price disponible
  let priceCLP = base.priceCLP ?? null
  if (Array.isArray(api.productEntries) && api.productEntries.length > 0) {
    let min = null
    for (const e of api.productEntries) {
      const reg = e && e.active_registry
      if (!reg || reg.is_available === false) continue
      const p = parseFloat(reg.offer_price ?? reg.normal_price)
      if (Number.isFinite(p) && p > 0 && (min === null || p < min)) min = Math.round(p)
    }
    if (min !== null) priceCLP = min
  }

  const type = base.typeSlug
  const row = {
    name: base.name,
    brand,
    typeSlug: type,
    imageUrl: base.imageUrl,
    priceCLP,
    priceUSD: null,
    specs: compactSpecs(specs),
  }

  if (type === 'cpu') {
    row.socket = str(specs.socket_unicode)
    row.tdp_w = num(specs.tdp)
    Object.assign(row.specs, {
      frequency: specs.frequency,
      turbo: specs.max_turbo_frequency,
      cores: specs.core_count_value,
      threads: specs.thread_count_value,
      architecture: specs.core_architecture_name,
    })
  } else if (type === 'gpu') {
    row.gpu_len_mm = num(specs.length)
    row.tdp_w = num(specs.gpu_tdp)
    row.specs.gpu = str(specs.gpu_name)
    row.specs.vram = str(specs.memory_quantity_unicode)
    row.specs.memory_type = str(specs.memory_type_name)
    if (specs.memory_quantity_value) row.specs.vram_mb = specs.memory_quantity_value
  } else if (type === 'motherboard') {
    row.socket = str(specs?.chipset_northbridge_family_socket_socket_unicode) || str(specs.socket_socket_unicode)
    row.chipset = str(specs.chipset_name)
    row.form_factor = str(specs.format_unicode)
    row.ram_type = str(specs?.memory_slots_mtype_itype_type_name)
    row.specs.wifi = /wifi/i.test(JSON.stringify(specs).slice(0, 2000)) || undefined
  } else if (type === 'ram') {
    const mCap = base.name.match(/(\d+)\s*GB/i)
    const mSpd = base.name.match(/(\d{4,5})\s*MT/i) || base.name.match(/DDR(\d)/i)
    if (mCap) row.capacity_gb = parseInt(mCap[1], 10)
    if (mSpd && mSpd[1].length >= 4) row.speed_mts = parseInt(mSpd[1], 10)
    const mType = base.name.match(/DDR[345]/i)
    if (mType) row.ram_type = mType[0].toUpperCase()
  } else if (type === 'storage') {
    const m = base.name.match(/(\d+)\s*(GB|TB)/i)
    if (m) row.capacity_gb = m[2].toUpperCase() === 'TB' ? parseInt(m[1], 10) * 1024 : parseInt(m[1], 10)
  } else if (type === 'psu') {
    const m = base.name.match(/(\d+)\s*W/i)
    if (m) row.psu_watts = parseInt(m[1], 10)
  }

  // Limpia undefined para JSON compacto
  for (const k of Object.keys(row)) {
    if (row[k] === undefined) delete row[k]
  }
  for (const k of Object.keys(row.specs || {})) {
    if (row.specs[k] === undefined) delete row.specs[k]
  }
  return row
}

async function fetchProduct(id) {
  let lastErr = null
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const res = await fetch(`https://api.solotodo.com/products/${id}/`, {
        headers: { 'User-Agent': 'BuildSafe-enrich/1.0', Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      lastErr = e
      await sleep(1000 * (i + 1))
    }
  }
  throw lastErr
}

async function main() {
  const data = JSON.parse(readFileSync(INPUT, 'utf-8'))
  const components = data.components ?? data
  let done = {}
  if (existsSync(PROGRESS)) {
    try { done = JSON.parse(readFileSync(PROGRESS, 'utf-8')).byName || {} } catch { done = {} }
  }

  const out = []
  const queue = components.filter((c) => !done[c.name])
  console.log(`Total: ${components.length}, pendientes: ${queue.length}`)

  let idx = 0
  async function worker() {
    while (idx < queue.length) {
      const c = queue[idx++]
      const pid = productIdFromImageUrl(c.imageUrl)
      try {
        if (!pid) throw new Error('sin product id')
        const api = await fetchProduct(pid)
        const row = mapRow(c, api)
        out.push(row)
        done[c.name] = true
        console.log(`OK [${Object.keys(done).length}/${components.length}] ${c.name.slice(0, 50)}`)
      } catch (e) {
        out.push({ ...c, specs: c.specs || {} })
        done[c.name] = 'error'
        console.log(`ERR ${c.name.slice(0, 50)}: ${e.message}`)
      }
      const doneCount = Object.keys(done).length
      if (doneCount % 25 === 0) {
        writeFileSync(PROGRESS, JSON.stringify({ byName: done, doneCount, total: components.length }))
      }
      await sleep(DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Reconstruye lista completa en orden original
  const enrichedByName = new Map(out.map((r) => [r.name, r]))
  const finalRows = components.map((c) => enrichedByName.get(c.name) || { ...c, specs: c.specs || {} })
  writeFileSync(OUTPUT, JSON.stringify(finalRows, null, 2))
  console.log(`Enriquecidos: ${finalRows.length} -> ${OUTPUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
