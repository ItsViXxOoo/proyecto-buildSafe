// Núcleo determinista de recomendación del Modo Rápido.
// SIN IA: selección 100% basada en reglas (tiers, presupuesto, compatibilidad).
// Módulo puro (sin dependencias de Supabase) para poder testearlo y re-utilizarlo.

export type UsoPrincipal = 'gaming' | 'oficina' | 'edicion' | 'streaming'
export type Resolucion = '1080p' | '1440p' | '4k'
export type Prioridad = 'rendimiento' | 'equilibrio' | 'silencio'

export interface Detalles {
  rgb: boolean
  wifi: boolean
  overclock: boolean
  prioridad: Prioridad
}

/** Componente mínimo que necesita el algoritmo (subconjunto de la fila de BD). */
export interface ComponenteCore {
  id: string
  name: string
  brand: string | null
  type_id: string
  is_active: boolean
  current_price: number | null
  socket: string | null
  form_factor: string | null
  ram_type: string | null
  chipset: string | null
  capacity_gb: number | null
  speed_mts: number | null
  gpu_len_mm: number | null
  supported_form_factors: string[] | null
  max_gpu_len_mm: number | null
  max_cooler_height_mm: number | null
  cooler_height_mm: number | null
  psu_watts: number | null
  tdp_w: number | null
  interface: string | null
  performance_tier: number | null
  specs: Record<string, unknown> | null
}

export interface TipoCore {
  id: string
  slug: string
}

export interface InputRecomendacion {
  presupuesto: number
  uso: UsoPrincipal
  resolucion: Resolucion
  detalles: Detalles
}

export interface RecomendacionItem {
  tipo: string
  tipoSlug: string
  componente: ComponenteCore
  precioAsignado: number
}

export interface ResultadoRecomendacion {
  items: RecomendacionItem[]
  precioTotal: number
  /** notas de filtros que se relajaron para no entregar un build vacío */
  relajaciones: string[]
}

/** Distribución de presupuesto por tipo según uso (plantilla; SIEMPRE copiar antes de modificar) */
const DISTRIBUCIONES: Record<UsoPrincipal, Record<string, number>> = {
  gaming: { cpu: 0.18, motherboard: 0.12, ram: 0.1, gpu: 0.35, storage: 0.07, psu: 0.08, case: 0.05, cooler: 0.05 },
  oficina: { cpu: 0.3, motherboard: 0.2, ram: 0.25, gpu: 0, storage: 0.15, psu: 0.06, case: 0.04, cooler: 0 },
  edicion: { cpu: 0.25, motherboard: 0.1, ram: 0.2, gpu: 0.2, storage: 0.15, psu: 0.06, case: 0.04, cooler: 0 },
  streaming: { cpu: 0.25, motherboard: 0.12, ram: 0.15, gpu: 0.25, storage: 0.08, psu: 0.09, case: 0.06, cooler: 0 },
}

/** Tier mínimo de GPU por resolución (escala 1-5) */
const TIER_GPU_MIN: Record<Resolucion, number> = { '1080p': 2, '1440p': 3, '4k': 4 }

/** RAM objetivo por uso (GB) */
const RAM_OBJETIVO: Record<UsoPrincipal, number> = { gaming: 16, oficina: 16, edicion: 32, streaming: 32 }

/** Banda de capacidad de storage por uso [min, max] (GB) */
const STORAGE_BANDA: Record<UsoPrincipal, [number, number]> = {
  gaming: [512, 2000],
  oficina: [256, 1000],
  edicion: [1024, 4000],
  streaming: [512, 2000],
}

/** Piso de velocidad por tipo de RAM (relajable si no hay opciones) */
const RAM_SPEED_MIN: Record<string, number> = { DDR3: 1600, DDR4: 2666, DDR5: 4800 }

/** Margen de seguridad sobre el consumo estimado (ALINEADO con el motor SQL: ×1.3) */
const MARGEN_PSU = 1.3

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const specsOf = (c: ComponenteCore): Record<string, unknown> => c.specs ?? {}
const campo = (c: ComponenteCore, k: string): unknown => (c as unknown as Record<string, unknown>)[k]
const precioDe = (c: ComponenteCore) => c.current_price ?? Number.MAX_SAFE_INTEGER
const minPrecio = (lista: ComponenteCore[]) =>
  lista.length === 0 ? Infinity : Math.min(...lista.map(precioDe))

/** Normaliza sockets: 'LGA 1151 (6ta / 7ma gen)' y 'LGA 1151' son el mismo socket */
export function normalizarSocket(s: string | null | undefined): string | null {
  if (!s) return null
  return s.replace(/\s*\(.*\)\s*$/, '').trim()
}

/** CPU con gráficos integrados usable (para oficinas y como fallback de presupuesto) */
export const cpuTieneIgpu = (c: ComponenteCore): boolean => {
  const g = specsOf(c)['graphics_name']
  return typeof g === 'string' && g !== '' && !/no posee/i.test(g)
}

/** CPU con cooler incluido (Boxed) vs Tray */
export const cpuTieneCoolerStock = (c: ComponenteCore): boolean => {
  const col = specsOf(c)['cooler_unicode']
  return typeof col === 'string' && col !== '' && !/no posee/i.test(col)
}

/** CPU desbloqueada para overclock (Intel K/KF/KS, AMD Ryzen X/X3D) sobre el nombre base */
export const cpuEsDesbloqueada = (c: ComponenteCore): boolean => {
  const base = c.name.split('[')[0]
  if (/Intel/i.test(base)) return /\bi[3579]-\d{3,5}(K|KF|KS)\b/i.test(base)
  if (/Ryzen/i.test(base)) return /\b\d{4,5}X(3D)?\b/i.test(base)
  return false
}

/** Campos significativos por tipo para el 10% de penal por datos incompletos */
const SIGNIFICATIVOS: Record<string, string[]> = {
  cpu: ['tdp_w', 'socket'],
  motherboard: ['socket', 'form_factor', 'ram_type', 'chipset'],
  ram: ['capacity_gb', 'speed_mts', 'ram_type'],
  gpu: ['tdp_w', 'gpu_len_mm'],
  storage: ['capacity_gb', 'interface'],
  psu: ['psu_watts'],
  case: ['max_gpu_len_mm', 'max_cooler_height_mm', 'supported_form_factors'],
  cooler: ['cooler_height_mm'],
}

function scoreComponente(c: ComponenteCore, slug: string, target: number, pesoTier: number): number {
  const tierNorm = ((c.performance_tier ?? 3) - 1) / 4
  const precio = precioDe(c)
  const tight =
    precio <= target ? 1 - Math.abs(precio - target) / Math.max(target, 1) : clamp01(0.3 - (precio - target) / Math.max(target, 1) * 0.3)
  const campos = SIGNIFICATIVOS[slug] ?? []
  const completitud =
    campos.length === 0
      ? 1
      : clamp01(campos.filter((k) => campo(c, k) !== null && campo(c, k) !== undefined).length / campos.length)
  return pesoTier * tierNorm + 0.35 * tight + 0.1 * completitud
}

interface PickResult {
  pick?: ComponenteCore
  ventanaFinal: number
}

/** Mejor candidato con precio <= ventana (duro). Empate: mejor score, luego más barato. */
function pickEn(
  candidatos: ComponenteCore[],
  slug: string,
  ventana: number,
  target: number,
  pesoTier: number,
): PickResult {
  const enRango = candidatos.filter((c) => precioDe(c) <= ventana)
  if (enRango.length === 0) return { ventanaFinal: ventana }
  const mejor = enRango
    .map((c) => ({ c, s: scoreComponente(c, slug, target, pesoTier) }))
    .sort((a, b) => b.s - a.s || precioDe(a.c) - precioDe(b.c))[0].c
  return { pick: mejor, ventanaFinal: precioDe(mejor) }
}

export function buildRecomendacion(
  input: InputRecomendacion,
  pool: ComponenteCore[],
  tipos: TipoCore[],
): ResultadoRecomendacion {
  const { presupuesto, uso, resolucion, detalles } = input
  const relajaciones: string[] = []

  // COPIA de la distribución: nunca mutar la plantilla
  const dist: Record<string, number> = { ...DISTRIBUCIONES[uso] }

  const tipoPorSlug = new Map(tipos.map((t) => [t.slug, t.id]))
  const porTipo = (slug: string): ComponenteCore[] =>
    pool.filter((c) => c.type_id === tipoPorSlug.get(slug) && c.is_active)

  const pesos: Record<string, number> = {
    cpu: 0.55, motherboard: 0.5, ram: 0.45, gpu: 0.6, storage: 0.4, psu: 0.35, case: 0.25, cooler: 0.25,
  }
  if (detalles.prioridad === 'rendimiento') {
    for (const k of Object.keys(pesos)) pesos[k] = Math.min(0.75, pesos[k] + 0.15)
  }

  const objetivo = (slug: string) => presupuesto * (dist[slug] ?? 0)
  const requiereWifi = (c: ComponenteCore): boolean =>
    detalles.wifi ? specsOf(c)['wifi'] === true || /wifi/i.test(c.name) : true
  const requiereRgb = (c: ComponenteCore): boolean =>
    detalles.rgb ? specsOf(c)['illumination_unicode'] !== undefined || /rgb/i.test(c.name) : true

  const items: RecomendacionItem[] = []
  const push = (slug: string, c: ComponenteCore | undefined, price: number) => {
    if (c) items.push({ tipo: slug, tipoSlug: slug, componente: c, precioAsignado: price })
  }
  const reemplazar = (slug: string, c: ComponenteCore, price: number) => {
    const idx = items.findIndex((i) => i.tipoSlug === slug)
    if (idx >= 0) items.splice(idx, 1)
    push(slug, c, price)
  }

  const gastoActual = () => items.reduce((s, i) => s + (i.componente.current_price ?? 0), 0)

  // Mínimos del resto del build (para reservar presupuesto al elegir)
  const coolers = porTipo('cooler')
  const minCooler = () => (items.some((i) => i.tipoSlug === 'cooler') ? 0 : minPrecio(coolers))
  const masBaratoDentro = (lista: ComponenteCore[], tope: number): ComponenteCore | undefined =>
    [...lista].sort((a, b) => precioDe(a) - precioDe(b)).find((c) => precioDe(c) <= tope)
  const masBaratoAbsoluto = (lista: ComponenteCore[]): ComponenteCore | undefined =>
    [...lista].sort((a, b) => precioDe(a) - precioDe(b))[0]
  /** Mínimo REAL de RAM con capacidad objetivo (por tipo de placa si se conoce) */
  const minRamReserva = (ramType: string | null | undefined): number => {
    const conCap = porTipo('ram').filter((r) => (r.capacity_gb ?? 0) >= RAM_OBJETIVO[uso])
    const porTipoRam = ramType ? conCap.filter((r) => r.ram_type === ramType) : conCap
    if (porTipoRam.length > 0) return minPrecio(porTipoRam)
    const soloTipo = ramType ? porTipo('ram').filter((r) => r.ram_type === ramType) : porTipo('ram')
    return soloTipo.length > 0 ? minPrecio(soloTipo) : minPrecio(porTipo('ram'))
  }
  /** Mínimo REAL de storage con la capacidad mínima del uso */
  const minStorageReserva = (): number => {
    const conCap = porTipo('storage').filter((s) => (s.capacity_gb ?? 0) >= STORAGE_BANDA[uso][0])
    return conCap.length > 0 ? minPrecio(conCap) : minPrecio(porTipo('storage'))
  }

  // ── 0. ¿GPU discreta factible? ─────────────────────────────────
  const gpus = porTipo('gpu')
  let tierGpuObj: number | null = null
  if (uso !== 'oficina' && gpus.length > 0) {
    const minRest = minPrecio(porTipo('cpu')) + minPrecio(porTipo('motherboard')) + minPrecio(porTipo('ram')) +
      minPrecio(porTipo('storage')) + minPrecio(porTipo('psu')) + minPrecio(porTipo('case')) + minPrecio(coolers)
    // prueba tier objetivo y, si no es posible, niveles inferiores
    for (let t = TIER_GPU_MIN[resolucion]; t >= 1; t--) {
      const minGpu = minPrecio(gpus.filter((g) => (g.performance_tier ?? 1) >= t))
      if (minGpu + minRest <= presupuesto * 0.97) {
        tierGpuObj = t
        if (t < TIER_GPU_MIN[resolucion]) relajaciones.push(`Presupuesto apretado: GPU tier >= ${TIER_GPU_MIN[resolucion]} no es posible; se usa tier >= ${t}`)
        break
      }
    }
    if (tierGpuObj === null) relajaciones.push('Presupuesto insuficiente para GPU discreta; se usará APU/iGPU')
  } else if (uso === 'oficina') {
    // Sin GPU discreta: el presupuesto de GPU se reparte
    dist.cpu += 0.35
    dist.motherboard += 0.05
    dist.storage += 0.05
    dist.ram += 0.03
    dist.psu += 0.02
  }

  // ── 1. Pareja CPU + Motherboard (socket coherente, presupuesto global) ──
  let cpuCands = porTipo('cpu')
  const igpuForzada = uso === 'oficina' || tierGpuObj === null
  if (igpuForzada) {
    const igpu = cpuCands.filter(cpuTieneIgpu)
    if (igpu.length > 0) cpuCands = igpu
    else relajaciones.push('Sin CPUs con iGPU disponibles; el build podría quedar sin gráficos')
  }
  if (detalles.overclock) {
    const desb = cpuCands.filter(cpuEsDesbloqueada)
    if (desb.length > 0) cpuCands = desb
    else relajaciones.push('overclock: sin CPUs desbloqueadas en rango; filtro relajado')
  }

  const mbs = porTipo('motherboard')
  const gpuReserve = tierGpuObj !== null ? minPrecio(gpus.filter((g) => (g.performance_tier ?? 1) >= tierGpuObj)) : 0
  const reservaSinRam = () =>
    presupuesto * 0.985 - minStorageReserva() - minPrecio(porTipo('psu')) - minPrecio(porTipo('case')) -
    minCooler() - gpuReserve

  let mejorPar: { cpu: ComponenteCore; mb: ComponenteCore; s: number } | null = null
  for (const cpu of cpuCands) {
    if (igpuForzada && !cpuTieneIgpu(cpu)) continue
    const socket = normalizarSocket(cpu.socket)
    const mbCands = mbs.filter((m) => !socket || normalizarSocket(m.socket) === socket)
    if (mbCands.length === 0) continue
    for (const mb of mbCands) {
      // reserva la RAM REAL del tipo de ESA placa (no el mínimo global del catálogo)
      const topePar = reservaSinRam() - minRamReserva(mb.ram_type)
      const total = precioDe(cpu) + precioDe(mb)
      if (total > topePar) continue
      const s = scoreComponente(cpu, 'cpu', objetivo('cpu'), pesos.cpu) + scoreComponente(mb, 'motherboard', objetivo('motherboard'), pesos.motherboard)
      if (!mejorPar || s > mejorPar.s) mejorPar = { cpu, mb, s }
    }
  }
  // Intento 2: flexibilizar la reserva de RAM (capacidad menor a la objetivo)
  if (!mejorPar) {
    relajaciones.push('Presupuesto muy ajustado: se flexibilizó la reserva de RAM para armar la pareja CPU+MB')
    for (const cpu of cpuCands) {
      if (igpuForzada && !cpuTieneIgpu(cpu)) continue
      const socket = normalizarSocket(cpu.socket)
      const mbCands = mbs.filter((m) => !socket || normalizarSocket(m.socket) === socket)
      if (mbCands.length === 0) continue
      for (const mb of mbCands) {
        const soloTipo = mb.ram_type ? porTipo('ram').filter((r) => r.ram_type === mb.ram_type) : porTipo('ram')
        const minRamRelajada = soloTipo.length > 0 ? minPrecio(soloTipo) : minPrecio(porTipo('ram'))
        const topePar = reservaSinRam() - minRamRelajada
        const total = precioDe(cpu) + precioDe(mb)
        if (total > topePar) continue
        const s = scoreComponente(cpu, 'cpu', objetivo('cpu'), pesos.cpu) + scoreComponente(mb, 'motherboard', objetivo('motherboard'), pesos.motherboard)
        if (!mejorPar || s > mejorPar.s) mejorPar = { cpu, mb, s }
      }
    }
  }
  if (!mejorPar) {
    // Fallback último: la pareja más barata del socket más común
    relajaciones.push('No hubo pareja CPU+MB dentro del rango; se tomó la más barata disponible')
    let mejorBarato: { cpu: ComponenteCore; mb: ComponenteCore } | null = null
    for (const cpu of cpuCands) {
      const socket = normalizarSocket(cpu.socket)
      const mbCands = mbs.filter((m) => !socket || normalizarSocket(m.socket) === socket)
      if (mbCands.length === 0) continue
      const mbBarata = [...mbCands].sort((a, b) => precioDe(a) - precioDe(b))[0]
      const total = precioDe(cpu) + precioDe(mbBarata)
      const mejorTotal = mejorBarato ? precioDe(mejorBarato.cpu) + precioDe(mejorBarato.mb) : Infinity
      if (total < mejorTotal) mejorBarato = { cpu, mb: mbBarata }
    }
    if (!mejorBarato) return { items: [], precioTotal: 0, relajaciones: [...relajaciones, 'No hay CPUs disponibles'] }
    mejorPar = { ...mejorBarato, s: 0 }
  }
  const cpu = mejorPar.cpu
  const mb = mejorPar.mb
  push('cpu', cpu, precioDe(cpu))
  push('motherboard', mb, precioDe(mb))

  // ── 2. RAM (match DDR + capacidad objetivo + piso de velocidad) ──
  const ramObjetivo = RAM_OBJETIVO[uso]
  const ramSpeedMin = mb.ram_type ? RAM_SPEED_MIN[mb.ram_type] ?? 0 : 0
  let ramCands = porTipo('ram').filter((r) => !mb.ram_type || r.ram_type === mb.ram_type)
  if (ramCands.length === 0) {
    relajaciones.push('RAM sin match de tipo con la placa; filtro relajado')
    ramCands = porTipo('ram')
  }
  const velOk = ramCands.filter((r) => (r.speed_mts ?? 0) >= ramSpeedMin)
  if (velOk.length > 0) ramCands = velOk
  const capOk = ramCands.filter((r) => (r.capacity_gb ?? 0) >= ramObjetivo)
  const topeRam = presupuesto * 0.985 - gastoActual() - minStorageReserva() - minPrecio(porTipo('psu')) - minPrecio(porTipo('case')) - minCooler() - gpuReserve
  const ventanaRam = Math.min(objetivo('ram'), topeRam)
  let ram: ComponenteCore | undefined
  if (capOk.length > 0) {
    const rram = pickEn(capOk, 'ram', ventanaRam, objetivo('ram'), pesos.ram)
    ram = rram.pick ?? masBaratoDentro(capOk, topeRam)
  }
  if (!ram) ram = masBaratoDentro(ramCands, topeRam)
  if (!ram) ram = masBaratoAbsoluto(ramCands)
  if (ram && capOk.length > 0 && precioDe(ram) > ventanaRam) {
    relajaciones.push('RAM limitada al mínimo disponible por presupuesto')
  }
  if (ram && (ram.capacity_gb ?? 0) < ramObjetivo) {
    relajaciones.push(`RAM de ${ramObjetivo} GB fuera de presupuesto; se usó una de ${ram.capacity_gb ?? '?'} GB`)
  }
  if (ram && precioDe(ram) > topeRam) {
    relajaciones.push('La RAM disponible más económica excede el presupuesto restante')
  }
  if (ram) push('ram', ram, precioDe(ram))

  // ── 3. GPU dentro de su ventana dura ───────────────────────────
  let gpu: ComponenteCore | undefined
  if (tierGpuObj !== null) {
    const budgetUsableGpu = presupuesto * 0.985 - gastoActual() - minPrecio(porTipo('storage')) - minPrecio(porTipo('psu')) - minPrecio(porTipo('case')) - minCooler()
    const sobranteAprox = Math.max(0, presupuesto - gastoActual() - objetivo('gpu'))
    const ventanaGpu = Math.min(objetivo('gpu') + sobranteAprox * 0.3, budgetUsableGpu)
    const tierOk = gpus.filter((g) => (g.performance_tier ?? 1) >= tierGpuObj)
    const rgbOk = tierOk.filter(requiereRgb)
    const baseGpu = rgbOk.length > 0 ? rgbOk : tierOk
    const rgpu = pickEn(baseGpu, 'gpu', ventanaGpu, objetivo('gpu'), pesos.gpu)
    if (rgpu.pick) {
      gpu = rgpu.pick
    } else {
      const r2 = pickEn(gpus, 'gpu', ventanaGpu, objetivo('gpu'), pesos.gpu)
      gpu = r2.pick
      if (gpu) relajaciones.push('GPU del tier objetivo no alcanzó el presupuesto restante; se tomó una alternativa')
    }
    if (gpu) push('gpu', gpu, precioDe(gpu))
    else relajaciones.push('GPU discreta imposible con el presupuesto restante; se usará la iGPU de la CPU')
  }

  // ── 4. Storage (banda por uso + NVMe preferente) ───────────────
  const [stMin, stMax] = STORAGE_BANDA[uso]
  let stCands = porTipo('storage').filter((s) => (s.capacity_gb ?? 0) >= stMin && (s.capacity_gb ?? 0) <= stMax)
  if (stCands.length === 0) stCands = porTipo('storage').filter((s) => (s.capacity_gb ?? 0) >= stMin)
  if (stCands.length === 0) {
    relajaciones.push(`storage >= ${stMin} GB no entró en el presupuesto`)
    stCands = porTipo('storage')
  }
  const nvme = stCands.filter((s) => /nvme/i.test(s.interface ?? ''))
  const topeSt = presupuesto * 0.985 - gastoActual() - minPrecio(porTipo('psu')) - minPrecio(porTipo('case')) - minCooler()
  const ventanaSt = Math.min(objetivo('storage'), topeSt)
  const baseSt = nvme.length > 0 ? nvme : stCands
  const rst = pickEn(baseSt, 'storage', ventanaSt, objetivo('storage'), pesos.storage)
  const storage = rst.pick ?? masBaratoDentro(baseSt, topeSt) ?? masBaratoAbsoluto(baseSt)
  if (storage) {
    if (!rst.pick && precioDe(storage) > ventanaSt) {
      relajaciones.push('El storage mínimo disponible excede lo previsto por el presupuesto')
    }
    push('storage', storage, precioDe(storage))
  }

  // ── 5. PSU (vatios requeridos = consumo × margen) ──────────────
  const consumo = (cpu.tdp_w ?? 0) + (gpu?.tdp_w ?? 0) + (gpu ? 0 : 50)
  const wattsReq = Math.ceil(consumo * MARGEN_PSU)
  let psuCands = porTipo('psu').filter((p) => (p.psu_watts ?? 0) >= wattsReq)
  if (psuCands.length === 0) {
    relajaciones.push(`Sin PSUs de ${wattsReq} W asequibles; se tomó la más cercana (el motor de compatibilidad avisará)`)
    psuCands = porTipo('psu')
  }
  if (detalles.prioridad === 'silencio') {
    const gold = psuCands.filter((p) => /gold|platinum|titanium/i.test(String(specsOf(p)['certification_unicode'] ?? '')))
    if (gold.length > 0) psuCands = gold
  }
  const topePsu = presupuesto * 0.985 - gastoActual() - minPrecio(porTipo('case')) - minCooler()
  const ventanaPsu = Math.min(objetivo('psu'), topePsu)
  const basePsu = psuCands.filter(requiereRgb)
  const rpsu = pickEn(basePsu.length > 0 ? basePsu : psuCands, 'psu', ventanaPsu, objetivo('psu'), pesos.psu)
  const psu = rpsu.pick ?? masBaratoDentro(psuCands, topePsu) ?? masBaratoAbsoluto(psuCands)
  if (psu) {
    if (!rpsu.pick && psu.psu_watts !== null && psu.psu_watts !== undefined && psu.psu_watts < wattsReq) {
      relajaciones.push(`La PSU elegida (${psu.psu_watts} W) queda bajo los ${wattsReq} W recomendados; el motor de compatibilidad lo advertirá`)
    }
    push('psu', psu, precioDe(psu))
  }

  // ── 6. Case (form factor + holgura GPU + RGB) ──────────────────
  const caseBase = porTipo('case').filter((k) => {
    if (!mb.form_factor || !k.supported_form_factors) return true
    return k.supported_form_factors.includes(mb.form_factor)
  })
  let caseCands = caseBase.length > 0 ? caseBase : porTipo('case')
  if (caseBase.length === 0) relajaciones.push('sin cases con form factor confirmado; filtro relajado')
  if (gpu?.gpu_len_mm) {
    const caben = caseCands.filter((k) => !k.max_gpu_len_mm || k.max_gpu_len_mm >= gpu!.gpu_len_mm!)
    if (caben.length > 0) caseCands = caben
  }
  const topeCase = presupuesto * 0.985 - gastoActual() - minCooler()
  const ventanaCase = Math.min(objetivo('case') || topeCase * 0.4, topeCase)
  const baseCase = caseCands.filter(requiereRgb)
  const rcase = pickEn(baseCase.length > 0 ? baseCase : caseCands, 'case', ventanaCase, objetivo('case'), pesos.case)
  const caseFinal = rcase.pick ?? masBaratoDentro(caseCands, topeCase) ?? masBaratoAbsoluto(caseCands)
  if (caseFinal) push('case', caseFinal, precioDe(caseFinal))

  // ── 7. Cooler (solo si la CPU NO trae stock) ───────────────────
  if (!cpuTieneCoolerStock(cpu)) {
    let coolCands = coolers
    if (caseFinal?.max_cooler_height_mm) {
      const caben = coolCands.filter((k) => (k.cooler_height_mm ?? 0) <= caseFinal.max_cooler_height_mm!)
      if (caben.length > 0) coolCands = caben
    }
    const presupuestoRestanteCool = presupuesto * 0.985 - gastoActual()
    if (minPrecio(coolCands) > presupuestoRestanteCool) {
      relajaciones.push('La CPU es Tray (sin cooler) y el presupuesto restante no alcanza; se omite el cooler')
    } else {
      const rgbCool = coolCands.filter(requiereRgb)
      const ventanaCool = Math.max(objetivo('cooler'), presupuestoRestanteCool)
      const targetCool = Math.max(objetivo('cooler') || presupuestoRestanteCool * 0.35, minPrecio(coolCands))
      const rcool = pickEn(rgbCool.length > 0 ? rgbCool : coolCands, 'cooler', ventanaCool, targetCool, pesos.cooler)
      const coolerSel = rcool.pick ?? masBaratoDentro(coolCands, presupuestoRestanteCool)
      if (coolerSel) push('cooler', coolerSel, precioDe(coolerSel))
      else relajaciones.push('No se pudo elegir cooler para la CPU Tray')
    }
  }

  // ── Rebalanceo: el sobrante refuerza la categoría de mayor impacto ─
  const totalParcial = gastoActual()
  const sobrante = presupuesto - totalParcial
  const boost = boostDe(uso)
  if (sobrante > presupuesto * 0.08) {
    const previo = items.find((i) => i.tipoSlug === boost)
    if (previo) {
      const ventana = precioDe(previo.componente) + sobrante * 0.7
      const cands = porTipo(boost)
      const rb = pickEn(cands, boost, ventana, precioDe(previo.componente), boost === 'cpu' ? pesos.cpu : pesos.gpu)
      const b = rb.pick
      if (b && b.id !== previo.componente.id) {
        reemplazar(boost, b, precioDe(b))
      }
    }
  }

  // ── Orden canónico final ───────────────────────────────────────
  const orden = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler']
  items.sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo))
  const precioTotal2 = gastoActual()
  return { items, precioTotal: precioTotal2, relajaciones }
}

function boostDe(uso: UsoPrincipal): 'gpu' | 'cpu' {
  return uso === 'oficina' ? 'cpu' : 'gpu'
}
