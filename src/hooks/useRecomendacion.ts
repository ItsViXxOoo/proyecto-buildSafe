import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../../supabase/database.types'
import { useBuilderRapido, type UsoPrincipal, type Resolucion } from '../context/BuilderRapidoContext'

type Component = Tables<'components'>

interface DistribucionPresupuesto {
  cpu: number
  motherboard: number
  ram: number
  gpu: number
  storage: number
  psu: number
  case: number
  cooler: number
}

const DISTRIBUCIONES: Record<UsoPrincipal, DistribucionPresupuesto> = {
  gaming: { cpu: 0.18, motherboard: 0.12, ram: 0.10, gpu: 0.35, storage: 0.07, psu: 0.08, case: 0.05, cooler: 0.05 },
  oficina: { cpu: 0.25, motherboard: 0.15, ram: 0.20, gpu: 0.05, storage: 0.15, psu: 0.10, case: 0.05, cooler: 0.05 },
  edicion: { cpu: 0.25, motherboard: 0.10, ram: 0.20, gpu: 0.20, storage: 0.15, psu: 0.05, case: 0.05, cooler: 0.00 },
  streaming: { cpu: 0.25, motherboard: 0.12, ram: 0.15, gpu: 0.25, storage: 0.08, psu: 0.08, case: 0.07, cooler: 0.00 },
}

const TIER_GPU: Record<Resolucion, number> = { '1080p': 1, '1440p': 2, '4k': 3 }

interface RecomendacionItem {
  tipo: string
  tipoSlug: string
  componente: Component
  precioAsignado: number
}

interface UseRecomendacionResult {
  recomendaciones: RecomendacionItem[]
  loading: boolean
  error: string | null
  precioTotal: number
}

export function useRecomendacion(): UseRecomendacionResult {
  const { state } = useBuilderRapido()
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { presupuesto, uso, resolucion, detalles } = state

  useEffect(() => {
    if (!presupuesto || !uso || !resolucion) {
      setRecomendaciones([])
      return
    }

    const presupuestoValido = presupuesto
    const usoValido = uso
    const resolucionValida = resolucion
    const detallesValidos = detalles

    let stale = false

    async function generarRecomendacion() {
      setLoading(true)
      setError(null)

      try {
        const distribucion = DISTRIBUCIONES[usoValido]
        const tierGPU = TIER_GPU[resolucionValida]

        const { data: tipos, error: tiposErr } = await supabase
          .from('component_types')
          .select('*')
        if (tiposErr) throw tiposErr

        const tipoMap = new Map(tipos.map((t) => [t.slug, t.id]))

        const resultados: RecomendacionItem[] = []

        async function buscarComponente(
          slug: string,
          presupuestoMax: number,
          filtros?: (c: Component) => boolean,
        ) {
          const tipoId = tipoMap.get(slug)
          if (!tipoId) return

          let query = supabase
            .from('components')
            .select('*')
            .eq('type_id', tipoId)
            .eq('is_active', true)
            .lte('current_price', presupuestoMax)
            .order('current_price', { ascending: false })

          const { data, error: err } = await query
          if (err) throw err

          let componentes = data ?? []
          if (filtros) componentes = componentes.filter(filtros)

          if (componentes.length > 0) {
            const seleccionado = componentes[0]
            resultados.push({
              tipo: slug,
              tipoSlug: slug,
              componente: seleccionado,
              precioAsignado: presupuestoMax,
            })
          }
        }

        const promesas: Promise<void>[] = [
          buscarComponente('cpu', presupuestoValido * distribucion.cpu, (c) => {
            if (detallesValidos.overclock) {
              const nombre = c.name.toLowerCase()
              return nombre.includes('k') || nombre.includes('x')
            }
            return true
          }),
          buscarComponente('motherboard', presupuestoValido * distribucion.motherboard, (c) => {
            if (detallesValidos.wifi) {
              const specs = c.specs as Record<string, unknown> | null
              return specs?.wifi === true || c.name.toLowerCase().includes('wifi')
            }
            return true
          }),
          buscarComponente('ram', presupuestoValido * distribucion.ram),
          buscarComponente('gpu', presupuestoValido * distribucion.gpu, (c) => {
            const specs = c.specs as Record<string, unknown> | null
            const tier = (specs?.tier as number) ?? 1
            return tier >= tierGPU
          }),
          buscarComponente('storage', presupuestoValido * distribucion.storage),
          buscarComponente('psu', presupuestoValido * distribucion.psu),
          buscarComponente('case', presupuestoValido * distribucion.case, (c) => {
            if (detallesValidos.rgb) {
              const specs = c.specs as Record<string, unknown> | null
              return specs?.rgb === true || c.name.toLowerCase().includes('rgb')
            }
            return true
          }),
        ]

        if (distribucion.cooler > 0) {
          promesas.push(buscarComponente('cooler', presupuestoValido * distribucion.cooler))
        }

        await Promise.all(promesas)

        if (stale) return

        resultados.sort((a, b) => {
          const orden = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler']
          return orden.indexOf(a.tipo) - orden.indexOf(b.tipo)
        })

        setRecomendaciones(resultados)
      } catch (e) {
        if (stale) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!stale) setLoading(false)
      }
    }

    void generarRecomendacion()

    return () => {
      stale = true
    }
  }, [presupuesto, uso, resolucion, detalles])

  const precioTotal = recomendaciones.reduce(
    (sum, r) => sum + (r.componente.current_price ?? 0),
    0,
  )

  return { recomendaciones, loading, error, precioTotal }
}
