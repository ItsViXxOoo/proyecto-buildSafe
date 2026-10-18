import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBuilderRapido } from '../context/BuilderRapidoContext'
import { buildRecomendacion, type ComponenteCore, type RecomendacionItem, type ResultadoRecomendacion } from '../lib/recomendacion-core'

/**
 * Hook del Modo Rápido: carga el catálogo activo (1 sola query) y delega la
 * selección en `buildRecomendacion` (algoritmo determinista, sin IA).
 * Los `overrides` del contexto reemplazan componentes elegidos manualmente
 * en el FinalizarStep (mismo type_id para validarlos).
 */
export function useRecomendacion(): {
  recomendaciones: RecomendacionItem[]
  resultado: ResultadoRecomendacion | null
  loading: boolean
  error: string | null
  precioTotal: number
  relajaciones: string[]
  /** Lista de alternativas activas de un tipo, ordenadas por precio asc. */
  alternativas: (tipoSlug: string) => ComponenteCore[]
} {
  const { state } = useBuilderRapido()
  const [resultado, setResultado] = useState<ResultadoRecomendacion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const { presupuesto, uso, resolucion, detalles, overrides } = state

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
      // Overrides manuales: reemplazan el componente recomendado del mismo tipo
      const itemsConOverrides = res.items.map((item) => {
        const overrideId = overrides[item.tipoSlug]
        if (!overrideId || overrideId === item.componente.id) return item
        const alt = cat.componentes.find(
          (c) => c.id === overrideId && c.type_id === item.componente.type_id && c.is_active,
        )
        if (!alt) return item
        return { ...item, componente: alt, precioAsignado: alt.current_price ?? item.precioAsignado }
      })
      const precioFinal = itemsConOverrides.reduce(
        (acc, it) => acc + (it.componente.current_price ?? 0),
        0,
      )
      setResultado({ ...res, items: itemsConOverrides, precioTotal: precioFinal })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [presupuesto, uso, resolucion, detalles, overrides, cat, ready])

  // Alternativas por tipo (para el modal de edición del FinalizarStep)
  const alternativas = useCallback(
    (tipoSlug: string): ComponenteCore[] => {
      if (!cat) return []
      const tipo = cat.tipos.find((t) => t.slug === tipoSlug)
      if (!tipo) return []
      return cat.componentes
        .filter((c) => c.type_id === tipo.id && c.is_active)
        .sort((a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity))
    },
    [cat],
  )

  return {
    recomendaciones: resultado?.items ?? [],
    resultado,
    loading,
    error,
    precioTotal: resultado?.precioTotal ?? 0,
    relajaciones: resultado?.relajaciones ?? [],
    alternativas,
  }
}
