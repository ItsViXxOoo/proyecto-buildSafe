import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBuilderRapido } from '../context/BuilderRapidoContext'
import { buildRecomendacion, type ComponenteCore, type RecomendacionItem, type ResultadoRecomendacion } from '../lib/recomendacion-core'

/**
 * Hook del Modo Rápido: carga el catálogo activo (1 sola query) y delega la
 * selección en `buildRecomendacion` (algoritmo determinista, sin IA).
 */
export function useRecomendacion(): {
  recomendaciones: RecomendacionItem[]
  resultado: ResultadoRecomendacion | null
  loading: boolean
  error: string | null
  precioTotal: number
  relajaciones: string[]
} {
  const { state } = useBuilderRapido()
  const [resultado, setResultado] = useState<ResultadoRecomendacion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const { presupuesto, uso, resolucion, detalles } = state

  // Catálogo + tipos: una sola carga, re-usada entre recálculos
  useEffect(() => {
    let stale = false
    setReady(false)
    void (async () => {
      try {
        const [{ data: tipos }, { data: componentes }] = await Promise.all([
          supabase.from('component_types').select('id, slug'),
          supabase.from('components').select('*').eq('is_active', true),
        ])
        if (stale) return
        setCat({ tipos: tipos ?? [], componentes: (componentes ?? []) as unknown as ComponenteCore[] })
        setReady(true)
      } catch (e) {
        if (!stale) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      stale = true
    }
  }, [])

  const [cat, setCat] = useState<{ tipos: { id: string; slug: string }[]; componentes: ComponenteCore[] } | null>(null)

  // Recompute determinista (sin llamadas de red) cuando cambian inputs o el catálogo
  useEffect(() => {
    if (!presupuesto || !uso || !resolucion) {
      setResultado(null)
      setLoading(false)
      return
    }
    if (!cat) {
      setLoading(true)
      return
    }
    setLoading(true)
    try {
      const res = buildRecomendacion(
        { presupuesto, uso, resolucion, detalles },
        cat.componentes,
        cat.tipos,
      )
      setResultado(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [presupuesto, uso, resolucion, detalles, cat, ready])

  return {
    recomendaciones: resultado?.items ?? [],
    resultado,
    loading,
    error,
    precioTotal: resultado?.precioTotal ?? 0,
    relajaciones: resultado?.relajaciones ?? [],
  }
}
