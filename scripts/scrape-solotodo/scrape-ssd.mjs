/**
 * Scraper de SSDs internos desde SoloTodo (categoría "unidades_de_estado_solido_ssds").
 * NO visita cada producto: las cards del listado traen todo inline (nombre, precio CLP
 * "Desde", Capacidad/Formado/Bus/DRAM/NAND). ~1 request por página de 20 items.
 * Output: data/ssds_scraped.json
 */
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://www.solotodo.cl/unidades_de_estado_solido_ssds'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DELAY_MS = 1500
const MAX_PAGES = 20
const OUTPUT = join(HERE, 'data', 'ssds_scraped.json')
const PROGRESS = join(HERE, 'data', 'ssd_progress.json')

// Marcas enterprise excluidas (coherente con ST_MARCAS_ENTERPRISE de recomendacion-core)
const MARCAS_ENTERPRISE = /(\d{4})?(\s)?\b(dell|hp|hpe|ibm|emc|fujitsu|lenovo|oracle|ubiquiti|hgst)\b/i
// Excluye USB externos por si se cuelan en la categoría
const ES_EXTERNO = /(portable|externo|ssd portátil|usb|conector)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(url) {
  let lastErr = null
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Accept-Language': 'es-CL,es;q=0.9' },
      })
      if (res.ok) return await res.text()
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastErr = e
    }
    await sleep(1000 * (i + 1))
  }
  throw lastErr
}

function parseCard(a, $) {
  const nombre = $(a).find('p.MuiTypography-body1').first().text().trim()
  const precioTxt = $(a).find('p.MuiTypography-h3, p.MuiTypography-h2, p.MuiTypography-h4').first().text().trim()
  const precioCLP = precioTxt ? parseInt(precioTxt.replace(/[^\d]/g, ''), 10) : null
  const specs = {}
  $(a).find('dl dt').each((_, dt) => {
    const dd = $(dt).next()
    specs[$(dt).text().trim().replace(/^¿?¿?/, '').trim()] = dd.text().trim()
  })
  const img = $(a).find('img').first().attr('src') ?? null
  const href = $(a).attr('href') ?? ''
  const pid = (href.match(/\/products\/(\d+)/) || [])[1] ?? null
  const capTxt = specs['Capacidad'] ?? ''
  const mCap = capTxt.match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i)
  const capacityGb = mCap ? (mCap[2].toUpperCase() === 'TB' ? Math.round(parseFloat(mCap[1]) * 1024) : parseInt(mCap[1], 10)) : null
  const bus = specs['Bus'] ?? ''
  const interfaceCol = /pcie/i.test(bus) ? 'NVMe' : /sata/i.test(bus) ? 'SATA' : null
  const formato = specs['Formato'] ?? null
  return {
    name: nombre,
    productId: pid,
    brand: null,
    priceCLP: precioCLP,
    capacityGb,
    interface: interfaceCol,
    imageUrl: img,
    specs: {
      interface: interfaceCol,
      type_name: 'SSD',
      bus_unicode: bus || undefined,
      storage_format: formato || undefined,
      dram: specs['Posee DRAM?'] || specs['¿Posee DRAM?'] || undefined,
      nand: specs['Tipo memoria NAND'] || undefined,
    },
  }
}

const BRANDS_MULTI = ['Western Digital', 'Kingston', 'Adata', 'ADATA', 'XPG', 'Crucial', 'Samsung', 'Seagate', 'Corsair', 'Kioxia', 'Toshiba', 'PNY', 'Silicon Power', 'Hiksemi', 'Lexar', 'Sonnet', 'Transcend', 'WD']
const brandOf = (name) => {
  for (const b of BRANDS_MULTI) {
    if (new RegExp(`^${b}\\b`, 'i').test(name)) return b === 'ADATA' || b === 'Adata' ? 'ADATA' : b === 'WD' ? 'Western Digital' : b
  }
  return name.split(/[\s(]/)[0] || 'Unknown'
}

async function main() {
  let done = {}
  if (existsSync(PROGRESS)) {
    try { done = JSON.parse(readFileSync(PROGRESS, 'utf-8')) } catch { done = {} }
  }
  const all = new Map(Object.entries(done))
  let pagesDone = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE_URL}?page=${page}`
    const html = await fetchPage(url)
    if (!html) break
    const $ = cheerio.load(html)
    const anchors = $('a[href*="/products/"]').toArray().filter((a) => $(a).find('dl dt').length > 0)
    if (anchors.length === 0) {
      console.log(`Página ${page}: fin (sin cards)`)
      break
    }
    let nuevos = 0
    for (const a of anchors) {
      const r = parseCard(a, $)
      if (!r.name || !r.priceCLP || !r.capacityGb) continue
      if (MARCAS_ENTERPRISE.test(r.name) || ES_EXTERNO.test(r.name)) continue
      const brand = brandOf(r.name)
      const key = r.name
      if (!all.has(key) || all.get(key).priceCLP !== r.priceCLP) nuevos++
      r.brand = brand
      all.set(key, r)
    }
    pagesDone++
    console.log(`Página ${page}: ${anchors.length} cards, nuevos ${nuevos} (total ${all.size})`)
    writeFileSync(PROGRESS, JSON.stringify(Object.fromEntries(all), null, 1))
    await sleep(DELAY_MS)
  }
  const rows = Array.from(all.values()).filter((r) => r.capacityGb >= 120 && r.capacityGb <= 8192)
  writeFileSync(OUTPUT, JSON.stringify(rows, null, 2))
  console.log(`Scrapeados: ${rows.length} SSDs internos (${pagesDone} páginas) -> ${OUTPUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
