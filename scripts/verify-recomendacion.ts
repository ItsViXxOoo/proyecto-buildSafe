// Verificación del Modo Rápido: ejecuta el algoritmo REAL (recomendacion-core)
// contra los datos reales de Supabase para todos los combos (uso × resolución × presupuesto).
// Uso: npx tsx scripts/verify-recomendacion.ts
import { readFileSync } from 'node:fs'
import { buildRecomendacion, type ComponenteCore, type Detalles, type Resolucion, type UsoPrincipal } from '../src/lib/recomendacion-core'

// ── .env ────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=') + 0) && l.replace(/^([^=]+)=.*/, '$1'), l.replace(/^[^=]+=/, '').trim()]),
)
const URL = env['VITE_SUPABASE_URL']
const KEY = env['VITE_SUPABASE_ANON_KEY']

const rest = async (path: string) => {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`REST ${res.status}: ${await res.text()}`)
  return res.json()
}

const contar = async (tabla: string) => {
  const res = await fetch(`${URL}/rest/v1/${tabla}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const c = res.headers.get('content-range')
  return c ? Number(c.split('/')[1]) : -1
}

const total = await contar('components')
const tipos = (await rest('component_types?select=id,slug')) as unknown as { id: string; slug: string }[]
const rows = await rest(`components?select=*&is_active=eq.true`)
if (rows.length !== total) throw new Error(`esperado ${total}, recibido ${rows.length}`)

const pool = rows as unknown as ComponenteCore[]
const detalleBase: Detalles = { rgb: false, wifi: false, overclock: false, prioridad: 'equilibrio' }

const USOS: UsoPrincipal[] = ['gaming', 'oficina', 'edicion', 'streaming']
const RESOLUCIONES: Resolucion[] = ['1080p', '1440p', '4k']
const PRESUPUESTOS = [300, 500, 1000, 1800, 3000, 5000]

const t1 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })
function conv(c: ComponenteCore, slug: string) {
  return `${slug}: ${c?.name?.slice(0, 34)} ($${t1(c?.current_price ?? 0)}, T${c?.performance_tier ?? '?'})`
}

let fallos = 0
for (const uso of USOS) {
  for (const resolucion of RESOLUCIONES) {
    for (const presupuesto of PRESUPUESTOS) {
      const det = { ...detalleBase }
      const r = buildRecomendacion({ presupuesto, uso, resolucion, detalles: det }, pool, tipos)
      const totalRp = r.precioTotal
      const categorias = r.items.map((i) => i.tipoSlug)
      const cpu = r.items.find((i) => i.tipoSlug === 'cpu')?.componente
      const mb = r.items.find((i) => i.tipoSlug === 'motherboard')?.componente
      const psu = r.items.find((i) => i.tipoSlug === 'psu')?.componente

      const problemas: string[] = []
      if (cpu && mb && cpu.socket && mb.socket && cpu.socket !== mb.socket)
        problemas.push(`socket CPU/MB incompatibles (${cpu.socket} vs ${mb.socket})`)
      if (totalRp > presupuesto * 1.05) problemas.push(`sobre presupuesto: $${t1(totalRp)} > $${t1(presupuesto)}`)
      if (psu?.psu_watts) {
        const gpu = r.items.find((i) => i.tipoSlug === 'gpu')?.componente
        const need = Math.ceil(((cpu?.tdp_w ?? 0) + (gpu?.tdp_w ?? 0) + (gpu ? 0 : 50)) * 1.3)
        if (psu.psu_watts < need) problemas.push(`PSU insuficiente: ${psu.psu_watts}W < ${need}W`)
      }
      if (!cpu) problemas.push('sin CPU')
      if (!mb) problemas.push('sin motherboard')
      if (uso === 'oficina' && categorias.includes('gpu') && cpu && cpuTieneIgpu(cpu) === false)
        problemas.push('oficina con GPU discreta además de CPU sin iGPU')
      if (uso !== 'oficina' && !categorias.includes('gpu') && !r.relajaciones.some((x) => x.includes('GPU')))
        problemas.push('sin GPU y sin relajación registrada')
      if (!categorias.includes('ram')) problemas.push('sin RAM')
      if (!categorias.includes('storage')) problemas.push('sin storage')

      const estado = problemas.length ? '❌' : '✅'
      if (problemas.length) fallos++
      console.log(
        `${estado} ${uso.padEnd(9)} ${resolucion} $${String(presupuesto).padEnd(5)} total $${String(t1(totalRp)).padEnd(6)} | ${conv(cpu!, 'cpu')} | ${conv(mb!, 'mb')} | PS ${psu?.psu_watts ?? '-'}W`,
      )
      r.items.slice(2).forEach((i) => console.log(`      ${conv(i.componente, i.tipoSlug)}`))
      if (problemas.length) {
        problemas.forEach((p) => console.log(`      ⚠ ${p}`))
      }
      if (r.relajaciones.length && !problemas.length) {
        r.relajaciones.forEach((x) => console.log(`      ~ ${x}`))
      }
    }
  }
}

console.log(fallos === 0 ? '\n✅ TODOS los combos OK' : `\n❌ ${fallos} combos con problemas`)
process.exit(fallos === 0 ? 0 : 1)

function cpuTieneIgpu_aux(c: ComponenteCore) {
  const g = (c.specs ?? {})['graphics_name']
  return typeof g === 'string' && g !== '' && !/no posee/i.test(g)
}
function cpuTieneIgpu(c: ComponenteCore) {
  return cpuTieneIgpu_aux(c)
}
