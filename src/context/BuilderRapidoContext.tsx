import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type UsoPrincipal = 'gaming' | 'oficina' | 'edicion' | 'streaming'
export type Resolucion = '1080p' | '1440p' | '4k'
export type Prioridad = 'rendimiento' | 'equilibrio' | 'silencio'

export interface Detalles {
  rgb: boolean
  wifi: boolean
  overclock: boolean
  prioridad: Prioridad
}

export interface BuilderRapidoState {
  presupuesto: number | null
  uso: UsoPrincipal | null
  resolucion: Resolucion | null
  detalles: Detalles
  /** typeSlug -> componentId elegido manualmente (modifica la recomendación base) */
  overrides: Record<string, string>
}

type Action =
  | { type: 'SET_PRESUPUESTO'; presupuesto: number }
  | { type: 'SET_USO'; uso: UsoPrincipal }
  | { type: 'SET_RESOLUCION'; resolucion: Resolucion }
  | { type: 'SET_DETALLES'; detalles: Partial<Detalles> }
  | { type: 'SET_OVERRIDE'; slug: string; componentId: string | null }
  | { type: 'RESET' }

const initialState: BuilderRapidoState = {
  presupuesto: null,
  uso: null,
  resolucion: null,
  detalles: {
    rgb: false,
    wifi: false,
    overclock: false,
    prioridad: 'equilibrio',
  },
  overrides: {},
}

function reducer(state: BuilderRapidoState, action: Action): BuilderRapidoState {
  switch (action.type) {
    case 'SET_PRESUPUESTO':
      return { ...state, presupuesto: action.presupuesto }
    case 'SET_USO':
      return { ...state, uso: action.uso }
    case 'SET_RESOLUCION':
      return { ...state, resolucion: action.resolucion }
    case 'SET_DETALLES':
      return { ...state, detalles: { ...state.detalles, ...action.detalles } }
    case 'SET_OVERRIDE': {
      const overrides = { ...state.overrides }
      if (action.componentId) overrides[action.slug] = action.componentId
      else delete overrides[action.slug]
      return { ...state, overrides }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface BuilderRapidoContextValue {
  state: BuilderRapidoState
  setPresupuesto: (presupuesto: number) => void
  setUso: (uso: UsoPrincipal) => void
  setResolucion: (resolucion: Resolucion) => void
  setDetalles: (detalles: Partial<Detalles>) => void
  setOverride: (slug: string, componentId: string | null) => void
  reset: () => void
}

const BuilderRapidoContext = createContext<BuilderRapidoContextValue | null>(null)

export function BuilderRapidoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setPresupuesto = (presupuesto: number) =>
    dispatch({ type: 'SET_PRESUPUESTO', presupuesto })
  const setUso = (uso: UsoPrincipal) => dispatch({ type: 'SET_USO', uso })
  const setResolucion = (resolucion: Resolucion) =>
    dispatch({ type: 'SET_RESOLUCION', resolucion })
  const setDetalles = (detalles: Partial<Detalles>) =>
    dispatch({ type: 'SET_DETALLES', detalles })
  const setOverride = (slug: string, componentId: string | null) =>
    dispatch({ type: 'SET_OVERRIDE', slug, componentId })
  const reset = () => dispatch({ type: 'RESET' })

  return (
    <BuilderRapidoContext.Provider
      value={{ state, setPresupuesto, setUso, setResolucion, setDetalles, setOverride, reset }}
    >
      {children}
    </BuilderRapidoContext.Provider>
  )
}

export function useBuilderRapido() {
  const ctx = useContext(BuilderRapidoContext)
  if (!ctx) {
    throw new Error('useBuilderRapido debe usarse dentro de BuilderRapidoProvider')
  }
  return ctx
}
