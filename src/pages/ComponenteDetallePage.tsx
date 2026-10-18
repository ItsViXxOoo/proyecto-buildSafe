import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TIPO_ICONOS } from '../builder-rapido/ComponenteRecomendado'

interface ComponenteDetalle {
  id: string
  name: string
  brand: string | null
  image_url: string | null
  current_price: number | null
  performance_tier: number | null
  socket: string | null
  ram_type: string | null
  form_factor: string | null
  capacity_gb: number | null
  speed_mts: number | null
  gpu_len_mm: number | null
  max_gpu_len_mm: number | null
  max_cooler_height_mm: number | null
  cooler_height_mm: number | null
  psu_watts: number | null
  tdp_w: number | null
  interface: string | null
  memory_slots: number | null
  ram_modules: number | null
  cooler_sockets: string[] | null
  supported_form_factors: string[] | null
  specs: Record<string, unknown> | null
  component_types: { name: string; slug: string } | null
}

type Par = { etiqueta: string; valor: string }

/** Etiquetas en español para claves de specs (lo no mapeado no se muestra). */
const ETIQUETAS_ESPEC: Record<string, string> = {
  part_number: 'Modelo (P/N)',
  architecture: 'Arquitectura',
  cores: 'Núcleos',
  threads: 'Hilos',
  frequency: 'Frecuencia base',
  max_turbo_frequency: 'Turbo máx.',
  turbo: 'Turbo máx.',
  tdp: 'Consumo (TDP)',
  graphics_name: 'Gráficos integrados',
  cooler_unicode: 'Refrigeración de fábrica',
  pcmark_10_score: 'Puntaje PCMark 10',
  ram_type: 'Tipo de RAM',
  chipset_unicode: 'Chipset',
  chipset: 'Chipset',
  form_factor: 'Factor de forma',
  memory_slots_unicode: 'Slots de memoria',
  latencia: 'Latencia (CL)',
  latency_cl_value: 'Latencia (CL)',
  bus_frequency_value: 'Frecuencia (MHz)',
  capacity_total_capacity_value: 'Capacidad total',
  memory_type: 'Tipo de memoria',
  memory_quantity_unicode: 'VRAM',
  gpu_name: 'Núcleo GPU',
  gpu_tdp: 'Consumo (TDP)',
  type_name: 'Tipo',
  bus_unicode: 'Bus de datos',
  capacity_value: 'Capacidad',
  power_value: 'Potencia',
  certification_unicode: 'Certificación',
  is_modular: 'Cables modulares',
  illumination_unicode: 'Iluminación',
  max_cpu_cooler_height: 'Altura máx. de cooler',
  max_video_card_length: 'Largo máx. de GPU',
  largest_motherboard_format_format_name: 'Formato máx. de placa',
  height: 'Altura',
  max_noise: 'Ruido máximo',
  max_airflow: 'Flujo de aire máx.',
  min_airflow: 'Flujo de aire mín.',
  max_rpm: 'Velocidad máx. (RPM)',
  min_rpm: 'Velocidad mín. (RPM)',
  fan_size_unicode: 'Ventilador',
  has_heatpipes: 'Con heatpipes',
  weight: 'Peso',
  wifi: 'WiFi integrado',
}

const CLAVES_IGNORAR = new Set([
  'picture',
  'default_bucket',
  'commercial_model',
  'brand_unicode',
  'brand_brand_unicode',
  'brand_brand_name',
  'sorting_max_noise',
  'sorting_weight',
  'mini',
])

/** Etiquetas para las columnas planas de la tabla components. */
const ETIQUETAS_FILAS: Record<string, string> = {
  socket: 'Socket',
  ram_type: 'Tipo de RAM',
  form_factor: 'Factor de forma',
  interface: 'Interfaz',
  capacity_gb: 'Capacidad',
  speed_mts: 'Velocidad',
  gpu_len_mm: 'Longitud',
  psu_watts: 'Potencia',
  tdp_w: 'Consumo (TDP)',
  memory_slots: 'Slots de memoria',
  ram_modules: 'Módulos por kit',
  cooler_height_mm: 'Altura',
  max_gpu_len_mm: 'Largo máx. de GPU',
  max_cooler_height_mm: 'Altura máx. de cooler',
  cooler_sockets: 'Sockets soportados',
  supported_form_factors: 'Formatos soportados',
}

function fmtFreq(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)} GHz` : `${n} MHz`
}

function fmtNum(value: unknown, unidad: string): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return ''
  return `${n.toLocaleString('es-CL')} ${unidad}`
}

function boolEs(value: unknown): string {
  if (value === true) return 'Sí'
  if (value === false) return 'No'
  return ''
}

/** Specs "clave" resaltadas por tipo (diseño Stitch: Especificaciones Clave). */
function clavesPorTipo(c: ComponenteDetalle): Par[] {
  const sp = c.specs ?? {}
  const sl = c.component_types?.slug ?? ''
  const pares: Par[] = []
  const add = (etiqueta: string, valor: unknown, fmt?: (v: unknown) => string) => {
    const v = fmt ? fmt(valor) : (valor ?? '')
    const s = String(v ?? '').trim()
    if (s && s !== 'No posee') pares.push({ etiqueta, valor: s })
  }

  if (sl === 'cpu') {
    add('Socket', c.socket ?? sp.socket)
    add('Núcleos', sp.cores)
    add('Hilos', sp.threads ?? sp.thread_count_value)
    add('Frecuencia base', sp.frequency, fmtFreq)
    add('Turbo máx.', sp.max_turbo_frequency ?? sp.turbo, fmtFreq)
    add('Consumo (TDP)', sp.tdp ?? c.tdp_w, (v) => fmtNum(v, 'W'))
    add('Gráficos integrados', sp.graphics_name)
    add('Arquitectura', sp.architecture)
  } else if (sl === 'motherboard') {
    add('Socket', c.socket ?? sp.socket)
    add('Chipset', sp.chipset_unicode ?? sp.chipset_name ?? sp.chipset)
    add('Tipo de RAM', c.ram_type ?? sp.ram_type)
    add('Slots de memoria', c.memory_slots ? `${c.memory_slots} slots` : sp.memory_slots_unicode)
    add('Factor de forma', c.form_factor ?? sp.form_factor)
    add('WiFi integrado', sp.wifi, boolEs)
  } else if (sl === 'ram') {
    add('Tipo de RAM', c.ram_type ?? sp.ram_type)
    add('Capacidad', c.capacity_gb, (v) => fmtNum(v, 'GB'))
    add('Módulos', c.ram_modules, (v) => `${v} módulo${Number(v) > 1 ? 's' : ''}`)
    add('Velocidad', c.speed_mts ?? sp.bus_frequency_value, (v) => fmtNum(v, 'MT/s'))
    add('Latencia (CL)', sp.latency_cl_value)
  } else if (sl === 'gpu') {
    add('VRAM', sp.memory_quantity_unicode ?? sp.vram)
    add('Tipo de memoria', sp.memory_type)
    add('Consumo (TDP)', sp.gpu_tdp ?? c.tdp_w, (v) => fmtNum(v, 'W'))
    add('Longitud', c.gpu_len_mm, (v) => fmtNum(v, 'mm'))
    add('Núcleo GPU', sp.gpu_name ?? sp.gpu)
  } else if (sl === 'storage') {
    add('Tipo', sp.type_name)
    add('Capacidad', c.capacity_gb, (v) => fmtNum(v, 'GB'))
    add('Interfaz', sp.bus_unicode ?? c.interface)
    add('Formato', sp.format_unicode ?? sp.disk_format)
  } else if (sl === 'psu') {
    add('Potencia', c.psu_watts ?? sp.power_value, (v) => fmtNum(v, 'W'))
    add('Certificación', sp.certification_unicode)
    add('Cables modulares', sp.is_modular, boolEs)
  } else if (sl === 'case') {
    add('Formato máx. de placa', sp.largest_motherboard_format_format_name)
    add('Altura máx. de cooler', sp.max_cpu_cooler_height ?? c.max_cooler_height_mm, (v) => fmtNum(v, 'mm'))
    add('Largo máx. de GPU', sp.max_video_card_length ?? c.max_gpu_len_mm, (v) => fmtNum(v, 'mm'))
    add('Iluminación', sp.illumination_unicode)
  } else if (sl === 'cooler') {
    add('Tipo', sp.type_name)
    add('Altura', c.cooler_height_mm ?? sp.height, (v) => fmtNum(v, 'mm'))
    add('Ruido máximo', sp.max_noise, (v) => fmtNum(v, 'dBA'))
    add('Sockets soportados', c.cooler_sockets?.join(', '))
  }

  return pares.slice(0, 8)
}

/** Duplicados a saltear en la ficha técnica (ya cubiertos por otra clave). */
const VALORES_YA_MOSTRADOS = (c: ComponenteDetalle): Set<string> => {
  const sp = c.specs ?? {}
  const saltear = new Set<string>()
  if (sp.socket ?? c.socket) saltear.add('socket'), saltear.add('socket_unicode')
  if (sp.chipset_unicode || sp.chipset_name || sp.chipset) {
    saltear.add('chipset_unicode'); saltear.add('chipset_name'); saltear.add('chipset')
  }
  if (sp.gpu_name ?? sp.gpu) saltear.add('gpu_name'), saltear.add('gpu')
  if (sp.memory_quantity_unicode ?? sp.vram) saltear.add('memory_quantity_unicode'), saltear.add('vram')
  if (sp.memory_quantity_value) saltear.add('memory_quantity_value')
  if (sp.ram_type ?? c.ram_type) saltear.add('ram_type')
  if (sp.form_factor ?? c.form_factor) saltear.add('form_factor')
  if (sp.tdp ?? sp.gpu_tdp ?? c.tdp_w) saltear.add('tdp'), saltear.add('gpu_tdp'), saltear.add('gpu_tdp_value')
  if (sp.memory_slots_unicode ?? c.memory_slots) {
    saltear.add('memory_slots_unicode'); saltear.add('memory_slots_quantity')
  }
  if (sp.thread_count_value ?? sp.threads) saltear.add('thread_count_value'), saltear.add('cores'), saltear.add('core_count_value')
  if (sp.max_turbo_frequency ?? sp.turbo) saltear.add('max_turbo_frequency'), saltear.add('turbo')
  if (sp.capacity_total_capacity_value ?? c.capacity_gb) saltear.add('capacity_total_capacity_value')
  if (sp.bus_frequency_value ?? c.speed_mts) saltear.add('bus_frequency_value')
  return saltear
}

/** Unidades por clave numérica para la ficha técnica. */
const UNIDADES_FICHA: Record<string, (v: unknown) => string> = {
  frequency: fmtFreq,
  turbo: fmtFreq,
  max_turbo_frequency: fmtFreq,
  bus_frequency_value: fmtFreq,
  tdp: (v) => fmtNum(v, 'W'),
  gpu_tdp: (v) => fmtNum(v, 'W'),
  height: (v) => fmtNum(v, 'mm'),
  max_cpu_cooler_height: (v) => fmtNum(v, 'mm'),
  max_video_card_length: (v) => fmtNum(v, 'mm'),
  max_noise: (v) => fmtNum(v, 'dBA'),
  capacity_value: (v) => fmtNum(v, 'GB'),
  weight: (v) => fmtNum(v, 'g'),
  max_airflow: (v) => fmtNum(v, 'CFM'),
}

/** Unidades para columnas planas en la ficha técnica. */
const UNIDADES_FILAS: Record<string, (v: number) => string> = {
  capacity_gb: (v) => `${v.toLocaleString('es-CL')} GB`,
  speed_mts: (v) => `${v.toLocaleString('es-CL')} MT/s`,
  gpu_len_mm: (v) => `${v} mm`,
  psu_watts: (v) => `${v} W`,
  tdp_w: (v) => `${v} W`,
  cooler_height_mm: (v) => `${v} mm`,
  max_gpu_len_mm: (v) => `${v} mm`,
  max_cooler_height_mm: (v) => `${v} mm`,
}

/** Ficha técnica completa: columnas planas + specs legibles, sin duplicados. */
function fichaTecnica(c: ComponenteDetalle): Par[] {
  const lista: Par[] = []
  const vistos = new Set<string>()
  const valYa = VALORES_YA_MOSTRADOS(c)

  for (const [key, etiqueta] of Object.entries(ETIQUETAS_FILAS)) {
    let valor: unknown = (c as unknown as Record<string, unknown>)[key]
    if (Array.isArray(valor)) valor = valor.filter(Boolean).join(', ')
    const num = Number(valor)
    const s = typeof valor === 'number' && Number.isFinite(num)
      ? (UNIDADES_FILAS[key]?.(num) ?? String(valor))
      : String(valor ?? '').trim()
    if (!s) continue
    lista.push({ etiqueta, valor: s })
    vistos.add(etiqueta)
  }

  const sp = c.specs ?? {}
  for (const [key, raw] of Object.entries(sp)) {
    if (CLAVES_IGNORAR.has(key)) continue
    if (key.endsWith('_value') && key.replace('_value', '_unicode') in sp) continue
    if (key.endsWith('_name') && key.replace('_name', '_unicode') in sp) continue
    const etiqueta = ETIQUETAS_ESPEC[key] ?? ETIQUETAS_ESPEC[key.replace(/_value$/, '')]
    if (!etiqueta || vistos.has(etiqueta) || valYa.has(key)) continue
    const fmt = UNIDADES_FICHA[key]
    let valor: unknown = raw
    if (typeof raw === 'boolean') valor = boolEs(raw)
    else if (fmt && raw != null && raw !== '') valor = fmt(raw)
    const s = String(valor ?? '').trim()
    if (!s || s === 'No posee') continue
    vistos.add(etiqueta)
    lista.push({ etiqueta, valor: s })
  }

  return lista
}

export function ComponenteDetallePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [comp, setComp] = useState<ComponenteDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const flujoModoRapido = searchParams.get('flujo') === 'modo-rapido'

  useEffect(() => {
    let stale = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const { data, error: err } = await supabase
          .from('components')
          .select('*, component_types ( name, slug )')
          .eq('id', id ?? '')
          .eq('is_active', true)
          .maybeSingle()
        if (err) throw err
        if (!stale) {
          setComp((data as unknown as ComponenteDetalle) ?? null)
          setLoading(false)
        }
      } catch (e) {
        if (!stale) {
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      }
    })()
    return () => {
      stale = true
    }
  }, [id])

  const claves = useMemo(() => (comp ? clavesPorTipo(comp) : []), [comp])
  const ficha = useMemo(() => (comp ? fichaTecnica(comp) : []), [comp])

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="material-symbols-outlined icon-spin">autorenew</span>
        <p>Cargando componente...</p>
      </div>
    )
  }

  if (error || !comp) {
    return (
      <div className="detalle-empty">
        <span className="material-symbols-outlined">error</span>
        <p>{error ? 'No pudimos cargar el componente.' : 'Componente no encontrado.'}</p>
        <Link to="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const tipoNombre = comp.component_types?.name ?? 'Componente'
  const tipoSlug = comp.component_types?.slug ?? 'cpu'

  const volver = () => {
    // 1) Retorno explícito del Modo Rápido; 2) último paso del wizard visitado
    // (cubre detalle abierto por URL directa mientras se está armando la build);
    // 3) history.back(); 4) presupuesto.
    const destinoParam = searchParams.get('volver')
    const rutaGuardada = sessionStorage.getItem('modo_rapido_ruta')
    if (destinoParam) {
      navigate(destinoParam)
    } else if (rutaGuardada) {
      navigate(rutaGuardada)
    } else if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate('/builder-rapido/presupuesto')
    }
  }

  const anadirABuild = () => {
    sessionStorage.setItem('modo_rapido_override', JSON.stringify({ slug: tipoSlug, id: comp.id }))
    navigate('/builder-rapido/finalizar')
  }

  return (
    <div className="detalle-componente">
      <div className="detalle-volver">
        <button type="button" className="btn btn-ghost" onClick={volver}>
          <span className="material-symbols-outlined">arrow_back</span>
          Volver
        </button>
      </div>

      <div className="detalle-grid">
        {/* Hero: imagen del componente (diseño Stitch, col 7/12) */}
        <div className="detalle-hero">
          <div className="detalle-hero-imagen">
            {comp.image_url ? (
              <img src={comp.image_url} alt={comp.name} loading="lazy" />
            ) : (
              <div className="detalle-hero-fallback" aria-hidden="true">
                <span className="material-symbols-outlined">{TIPO_ICONOS[tipoSlug] ?? 'computer'}</span>
              </div>
            )}
            <span className="detalle-hero-badge">{tipoNombre}</span>
          </div>
        </div>

        {/* Col derecha (5/12): datos + acciones */}
        <div className="detalle-info">
          <div>
            <p className="detalle-categoria">{comp.brand ?? tipoNombre}</p>
            <h1 className="detalle-titulo">{comp.name}</h1>
            <div className="detalle-precio-fila">
              <span className="detalle-precio">
                {comp.current_price != null ? `$${comp.current_price.toLocaleString()}` : '—'}
              </span>
              {comp.performance_tier && (
                <span className={`detalle-tier tier-${comp.performance_tier}`}>
                  Tier {comp.performance_tier}
                </span>
              )}
            </div>
          </div>

          {claves.length > 0 && (
            <div className="detalle-claves">
              <h3>Especificaciones clave</h3>
              {claves.map((p) => (
                <div key={p.etiqueta} className="detalle-clave">
                  <span className="detalle-clave-etiqueta">{p.etiqueta}</span>
                  <span className="detalle-clave-valor">{p.valor}</span>
                </div>
              ))}
            </div>
          )}

          {flujoModoRapido && (
            <div className="detalle-acciones">
              <button type="button" className="btn btn-primary detalle-btn-principal" onClick={anadirABuild}>
                <span className="material-symbols-outlined">shopping_cart</span>
                Añadir a mi build
              </button>
              <p className="detalle-acciones-nota">
                Aplica el cambio en tu recomendación del Modo Rápido y revisa la compatibilidad al volver.
              </p>
            </div>
          )}
        </div>
      </div>

      {ficha.length > 0 && (
        <div className="detalle-ficha">
          <h3>Ficha técnica</h3>
          <div className="detalle-ficha-grid">
            {ficha.map((p) => (
              <div key={p.etiqueta} className="detalle-ficha-item">
                <span className="detalle-ficha-etiqueta">{p.etiqueta}</span>
                <span className="detalle-ficha-valor">{p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
