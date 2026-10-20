/**
 * Auditoría "vida real" del Modo Rápido (matriz 4 usos × 3 res × 6 presupuestos × 3 prioridades).
 * Por cada combo: valida plausibilidad física/comercial del build generado
 * (además de la compatibilidad del motor SQL):
 *  - RAM: sin SO-DIMM en desktop; dual-channel alcanzable cuando el presupuesto da
 *  - PSU: marca real (no OEM de gabinete) y vatios >= consumo × 1.3
 *  - Storage: sin discos de servidor; SSD/NVMe como disco único cuando el presupuesto da
 *  - Motor SQL: 0 errores de compatibilidad (preview_build_compatibility)
 */
import { readFileSync } from 'node:fs'
import { buildRecomendacion, PSU_MARCAS_REALES, stEsServidor, stEsHdd, stEsNvme, esRamSodimm } from '../src/lib/recomendacion-core.ts'
import type { ComponenteCore, TipoCore } from '../src/lib/recomendacion-core.ts'

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.replace(/^([^=]+)=.*/, '$1'), l.replace(/^[^=]+=/, '').trim()]),
)
const URL = env['VITE_SUPABASE_URL']
const KEY = env['VITE_SUPABASE_ANON_KEY']

const rest = async <T>(path: string): Promise<T[]> => {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!res.ok) throw new Error(`REST ${res.status}: ${await res.text()}`)
  return res.json()
}

const tipos = await rest<TipoCore>('component_types?select=id,slug')
const pool = await rest<ComponenteCore>('components?select=*&is_active=eq.true')

const res = await fetch(`${URL}/rest/v1/rpc/preview_build_compatibility`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_parts: [] }),
})
if (res.ok) void res.json()

const preview = async (partes: { id: string }[]): Promise<Array<{ severity: string; message: string }>> => {
  const r = await fetch(`${URL}/rest/v1/rpc/preview_build_compatibility`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_parts: partes.map((p) => ({ id: p.id, quantity: 1 })) }),
  })
  if (!r.ok) throw new Error(`RPC ${r.status}: ${await r.text()}`)
  return r.json()
}

// precios mínimos de referencia (para "¿el presupuesto daba para más?")
const porTipo = (slug: string) => pool.filter((c) => c.type_id === tipos.find((t) => t.slug === slug)?.id)
const precio = (c: ComponenteCore) => c.current_price ?? Infinity
const minSsdConCap = (min: number) =>
  Math.min(...porTipo('storage')
    .filter((s) => !stEsServidor(s) && !stEsHdd(s) && (s.capacity_gb ?? 0) >= min)
    .map(precio))
void minSsdConCap

type Violacion = { tag: string; tipo: string; detalle: string }

const CONTEOS: Record<string, number> = {}
const EJEMPLOS: Record<string, Violacion> = {}
const viola = (tag: string, tipo: string, detalle: string) => {
  CONTEOS[tag] = (CONTEOS[tag] ?? 0) + 1
  if (!EJEMPLOS[tag]) EJEMPLOS[tag] = { tag, tipo, detalle }
}

const USOS = ['gaming', 'oficina', 'edicion', 'streaming'] as const
const RESOS = ['1080p', '1440p', '4k'] as const
const PRESUS = [300, 500, 1000, 1800, 3000, 5000]
const PRIOS = ['equilibrio', 'rendimiento', 'silencio'] as const

let total = 0
let totalOk = 0
let errMotor = 0

for (const uso of USOS) {
  for (const reso of RESOS) {
    for (const presupuesto of PRESUS) {
      for (const prioridad of PRIOS) {
        total++
        const tag = `${uso}/${reso}/$${presupuesto}/${prioridad}`
        const r = buildRecomendacion(
          { presupuesto, uso, resolucion: reso, detalles: { rgb: false, wifi: false, overclock: false, prioridad } },
          pool, tipos,
        )
        const get = (slug: string): ComponenteCore | undefined =>
          r.items.find((i) => i.tipoSlug === slug)?.componente
        const getRam = (): ComponenteCore | undefined =>
          r.items.find((i) => i.tipoSlug === 'ram')?.componente

        // ── Motor SQL ──
        const resultados = await preview(r.items.map((i) => ({ id: i.componente.id })))
        if (resultados.some((x) => x.severity === 'error')) {
          errMotor++
          viola('motor_errores', tag, resultados.filter((x) => x.severity === 'error').map((x) => x.message).join(' + '))
        }

        // ── RAM ──
        const ram = getRam()
        if (ram && esRamSodimm(ram)) viola('ram_sodimm', tag, ram.name)
        if (ram && (ram.ram_modules ?? 1) < 2) {
          // ¿Existe un kit dual equivalente con premium razonable (<= 1.35×)?
          const mbRamType = get('motherboard')?.ram_type ?? null
          const duals = porTipo('ram')
            .filter((r) => !esRamSodimm(r) && (r.ram_modules ?? 1) >= 2)
            .filter((r) => (r.capacity_gb ?? 0) >= (ram.capacity_gb ?? 0) && (!mbRamType || r.ram_type === mbRamType))
            .filter((r) => (r.speed_mts ?? 0) >= (ram.speed_mts ?? 0))
          const mejorDual = Math.min(...duals.map(precio))
          if (Number.isFinite(mejorDual) && mejorDual <= precio(ram) * 1.35) {
            viola('ram_single_canal', tag, `${ram.name} $${ram.current_price} (dual equivalente desde $${mejorDual})`)
          }
        }

        // ── PSU ──
        const psu = get('psu')
        if (psu) {
          if (!PSU_MARCAS_REALES.has((psu.brand ?? '').toLowerCase())) {
            viola('psu_marca_oem', tag, `${psu.brand} ${psu.name} $${psu.current_price}`)
          }
          const cpu = get('cpu')
          const gpu = get('gpu')
          const consumo = (cpu?.tdp_w ?? 0) + (gpu?.tdp_w ?? 0) + (gpu ? 0 : 50)
          if (psu.psu_watts && psu.psu_watts < Math.ceil(consumo * 1.3)) {
            viola('psu_watts_bajos', tag, `${psu.psu_watts}W < ${Math.ceil(consumo * 1.3)}W para ${cpu?.name}/${gpu?.name}`)
          }
        }

        // ── Storage ──
        const st = get('storage')
        if (st) {
          if (stEsServidor(st)) viola('storage_servidor', tag, st.name)
          if (stEsHdd(st)) {
            const mb = get('motherboard')
            const minSsd = minSsdConCap(st.capacity_gb ?? 0)
            if (Number.isFinite(minSsd) && minSsd <= st.current_price! * 1.6) {
              viola('storage_hdd_unico', tag, `${st.name} $${st.current_price} (SSD desde $${minSsd})`)
            }
            void mb
          }
        }
        if (r.relajaciones.length === 0) totalOk++
      }
    }
  }
}

console.log(`\n== AUDITORÍA VIDA REAL: ${total} combos, ${totalOk} sin relajaciones, ${errMotor} con error de motor ==`)
const conciso = Object.keys(CONTEOS).length === 0
if (conciso) {
  console.log('✅ 0 violaciones de plausibilidad en los 216 builds')
} else {
  let base: keyof typeof CONTEOS
  void base
  for (const [k, n] of Object.entries(CONTEOS)) {
    console.log(`\n❌ ${k}: n=${n}`)
    console.log(`   ${EJEMPLOS[k]!.tipo}`)
    console.log(`   ${EJEMPLOS[k]!.detalle}`)
  }
}
process.exit(conciso ? 0 : 1)
