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

const USD_CLP_RATE = 950

const escapeSql = (s) => (s ? String(s).replace(/'/g, "''") : null)
const jsonEscape = (obj) => (obj ? JSON.stringify(obj).replace(/'/g, "''") : null)

// Campos compactos a conservar en specs por tipo (el resto es ruido de la API)
const SPEC_KEEP = {
  cpu: ['frequency', 'max_turbo_frequency', 'core_count_value', 'thread_count_value', 'tdp', 'architecture', 'graphics_name', 'turbo', 'cores', 'threads', 'socket_unicode', 'part_number'],
  gpu: ['gpu_name', 'memory_quantity_unicode', 'memory_quantity_value', 'memory_type_name', 'gpu_tdp', 'length', 'bus_unicode', 'tdp', 'gpu', 'vram', 'vram_gb', 'memory_type'],
  motherboard: ['chipset_name', 'chipset_unicode', 'memory_slots_unicode', 'form_factor', 'ram_type', 'socket', 'wifi'],
  ram: ['capacity_total_capacity_value', 'bus_frequency_value', 'latency_cl_value', 'part_number'],
  storage: ['capacity_value', 'type_name', 'bus_unicode'],
  psu: ['power_value', 'certification_unicode', 'is_modular'],
  case: ['max_video_card_length', 'max_cpu_cooler_height', 'largest_motherboard_format_format_name', 'illumination_unicode'],
  cooler: ['height', 'type_name', 'max_noise'],
}

function compactSpecs(specs, type) {
  if (!specs || typeof specs !== 'object') return {}
  const keep = new Set([...(SPEC_KEEP[type] || []), 'socket', 'chipset', 'form_factor', 'ram_type', 'wifi', 'cores', 'threads', 'turbo', 'architecture', 'gpu', 'vram', 'vram_gb', 'memory_type', 'tdp', 'length'])
  const out = {}
  for (const [k, v] of Object.entries(specs)) {
    if (!keep.has(k)) continue
    if (v === null || v === undefined) continue
    if (typeof v === 'object') continue
    out[k] = v
  }
  return out
}

// Deriva columnas planas (compatibilidad + filtros) desde specs de la API,
// con fallback a valores ya presentes y al parseo del nombre
function deriveFlat(r) {
  const s = r.specs || {}
  const f = {}
  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  if (r.typeSlug === 'cpu') {
    f.socket = r.socket || s.socket_unicode
    f.tdp_w = r.tdp_w ?? num(s.tdp)
  } else if (r.typeSlug === 'gpu') {
    f.gpu_len_mm = r.gpu_len_mm ?? num(s.length)
    f.tdp_w = r.tdp_w ?? num(s.gpu_tdp)
  } else if (r.typeSlug === 'motherboard') {
    f.socket = r.socket || s.chipset_northbridge_family_socket_socket_unicode || s.chipset_northbridge_family_socket_unicode
    f.chipset = r.chipset || s.chipset_name
    f.form_factor = r.form_factor || s.format_unicode
    f.ram_type = r.ram_type || s.memory_slots_mtype_itype_type_name
  } else if (r.typeSlug === 'ram') {
    f.ram_type = r.ram_type || s.bus_bus_bus_type_name
    f.capacity_gb = r.capacity_gb
    f.speed_mts = r.speed_mts
  } else if (r.typeSlug === 'storage') {
    f.capacity_gb = r.capacity_gb
    f.interface = r.interface || s.type_name
  } else if (r.typeSlug === 'psu') {
    f.psu_watts = r.psu_watts
  } else if (r.typeSlug === 'case') {
    f.max_gpu_len_mm = num(s.max_video_card_length)
    f.max_cooler_height_mm = num(s.max_cpu_cooler_height)
    const ff = s.largest_motherboard_format_format_name
    if (ff) f.supported_form_factors = [ff]
  } else if (r.typeSlug === 'cooler') {
    f.cooler_height_mm = num(s.height)
  }
  return f
}

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
  const slug = (r.typeSlug && typeIds[r.typeSlug]) ? r.typeSlug : getTypeSlug(r.name);
  const typeId = typeIds[slug];
  const s = r.specs || {};
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  };
  const pick = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  };

  // Derivar columnas planas desde specs de la API, con fallback a lo ya presente
  // (acepta snake_case y camelCase por compatibilidad entre versiones del JSON)
  const g = (snake, camel) => r[snake] ?? r[camel];
  let socket = g('socket', 'socket'), formFactor = g('form_factor', 'formFactor'), ramType = g('ram_type', 'ramType'), chipset = g('chipset', 'chipset');
  let capacityGb = g('capacity_gb', 'capacityGb'), speedMts = g('speed_mts', 'speedMts');
  let gpuLenMm = g('gpu_len_mm', 'gpuLenMm'), psuWatts = g('psu_watts', 'psuWatts'), tdpW = g('tdp_w', 'tdpW'), interfaceCol = r.interface;
  let maxGpuLenMm, maxCoolerH, coolerH, supFF;
  if (slug === 'cpu') {
    socket = r.socket || s.socket_unicode;
    tdpW = r.tdp_w ?? num(s.tdp);
  } else if (slug === 'gpu') {
    gpuLenMm = r.gpu_len_mm ?? num(s.length);
    tdpW = r.tdp_w ?? num(s.gpu_tdp);
  } else if (slug === 'motherboard') {
    socket = r.socket || s.chipset_northbridge_family_socket_socket_unicode || s.chipset_northbridge_family_socket_unicode;
    chipset = r.chipset || s.chipset_name;
    formFactor = r.form_factor || s.format_unicode;
    ramType = r.ram_type || s.memory_slots_mtype_itype_type_unicode || s.memory_slots_mtype_unicode;
  } else if (slug === 'ram') {
    ramType = r.ram_type || s.bus_bus_bus_type_name;
    speedMts = r.speed_mts ?? num(s.bus_frequency_value);
  } else if (slug === 'storage') {
    const t = s.type_name || '';
    interfaceCol = r.interface || (/nvme/i.test(t) ? 'NVMe' : /sata/i.test(JSON.stringify(s.bus_unicode || '')) ? 'SATA' : (/hdd/i.test(t) ? 'SATA' : t || undefined));
  } else if (slug === 'case') {
    maxGpuLenMm = num(s.max_video_card_length);
    maxCoolerH = num(s.max_cpu_cooler_height);
    const ff = s.largest_motherboard_format_format_name;
    if (ff) supFF = [ff];
  } else if (slug === 'cooler') {
    coolerH = num(s.height);
  }

  const compact = compactSpecs({ ...s, socket, form_factor: formFactor, ram_type: ramType, chipset, interface: interfaceCol }, slug);
  const specs = jsonEscape(compact) || "'{}'::jsonb";
  const imageUrl = escapeSql(r.imageUrl ?? r.image_url);
  const currentPriceUSD = r.priceCLP ? Math.round(r.priceCLP / USD_CLP_RATE) : 'NULL';
  const supFFArr = supFF ? `ARRAY[${supFF.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',')}]` : 'NULL';

  return `('${escapeSql(r.name)}', '${escapeSql(r.brand)}', '${typeId}', 'USD', ${specs}, ${socket ? `'${escapeSql(socket)}'` : 'NULL'}, ${formFactor ? `'${escapeSql(formFactor)}'` : 'NULL'}, ${ramType ? `'${escapeSql(ramType)}'` : 'NULL'}, ${chipset ? `'${escapeSql(chipset)}'` : 'NULL'}, ${capacityGb ?? 'NULL'}, ${speedMts ?? 'NULL'}, ${gpuLenMm ?? 'NULL'}, ${supFFArr}, ${maxGpuLenMm ?? 'NULL'}, ${maxCoolerH ?? 'NULL'}, ${coolerH ?? 'NULL'}, ${psuWatts ?? 'NULL'}, ${tdpW ?? 'NULL'}, ${interfaceCol ? `'${escapeSql(interfaceCol)}'` : 'NULL'}, ${imageUrl ? `'${imageUrl}'` : 'NULL'}, ${currentPriceUSD}, true)`
})

const header = 'INSERT INTO components (name, brand, type_id, price_currency, specs, socket, form_factor, ram_type, chipset, capacity_gb, speed_mts, gpu_len_mm, supported_form_factors, max_gpu_len_mm, max_cooler_height_mm, cooler_height_mm, psu_watts, tdp_w, interface, image_url, current_price, is_active) VALUES'
const batchSize = 50
const fs = await import('fs')

for (let i = 0; i < values.length; i += batchSize) {
  const batch = values.slice(i, i + batchSize)
  const batchNum = Math.floor(i / batchSize) + 1
  const batchSql = header + '\n' + batch.join(',\n') + '\nON CONFLICT (name, brand) DO UPDATE SET image_url = EXCLUDED.image_url, current_price = EXCLUDED.current_price, specs = EXCLUDED.specs, socket = EXCLUDED.socket, form_factor = EXCLUDED.form_factor, ram_type = EXCLUDED.ram_type, chipset = EXCLUDED.chipset, capacity_gb = EXCLUDED.capacity_gb, speed_mts = EXCLUDED.speed_mts, gpu_len_mm = EXCLUDED.gpu_len_mm, supported_form_factors = EXCLUDED.supported_form_factors, max_gpu_len_mm = EXCLUDED.max_gpu_len_mm, max_cooler_height_mm = EXCLUDED.max_cooler_height_mm, cooler_height_mm = EXCLUDED.cooler_height_mm, psu_watts = EXCLUDED.psu_watts, tdp_w = EXCLUDED.tdp_w, interface = EXCLUDED.interface, is_active = true;'
  fs.writeFileSync(`data/batch_${batchNum}.sql`, batchSql)
}

const fullSql = header + '\n' + values.join(',\n') + ';'
writeFileSync('data/insert_components.sql', fullSql)
console.log('Batches generados:', Math.ceil(values.length / batchSize))
