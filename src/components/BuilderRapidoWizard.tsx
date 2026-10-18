import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useBuilderRapido } from '../context/BuilderRapidoContext'

const PASOS = [
  { path: 'presupuesto', label: 'Presupuesto', icon: 'payments' },
  { path: 'uso', label: 'Uso', icon: 'sports_esports' },
  { path: 'resolucion', label: 'Resolución', icon: 'monitor' },
  { path: 'detalles', label: 'Detalles', icon: 'tune' },
  { path: 'finalizar', label: 'Finalizar', icon: 'check_circle' },
] as const

const PASOS_REQUISITOS: Record<string, (state: ReturnType<typeof useBuilderRapido>['state']) => boolean> = {
  presupuesto: (s) => s.presupuesto !== null,
  uso: (s) => s.presupuesto !== null,
  resolucion: (s) => s.presupuesto !== null && s.uso !== null,
  detalles: (s) => s.presupuesto !== null && s.uso !== null && s.resolucion !== null,
  finalizar: (s) =>
    s.presupuesto !== null && s.uso !== null && s.resolucion !== null,
}

function WizardContent() {
  const { state } = useBuilderRapido()
  const location = useLocation()
  const navigate = useNavigate()

  // Registrar el paso actual para que el detalle de componente
  // pueda volver a donde el usuario estaba (fallback sin ?volver=)
  useEffect(() => {
    sessionStorage.setItem('modo_rapido_ruta', location.pathname)
  }, [location.pathname])

  const currentIndex = PASOS.findIndex(
    (p) => location.pathname.endsWith(p.path),
  )

  if (currentIndex === -1) {
    // Redirección inteligente: retomar en el primer paso pendiente, o en
    // Finalizar si el estado de la build ya está completo
    const primerIncompleto = PASOS.find(
      (p) => !PASOS_REQUISITOS[p.path]?.(state),
    )
    return <Navigate to={primerIncompleto?.path ?? 'finalizar'} replace />
  }

  const pasoActual = PASOS[currentIndex]
  const requisito = PASOS_REQUISITOS[pasoActual.path]
  if (requisito && !requisito(state)) {
    // Volver al primer paso pendiente; si ya es el actual, se renderiza normal
    // (la UI bloquea avanzar con el botón Siguiente deshabilitado)
    const primerPasoIncompleto = PASOS.find((p) => !PASOS_REQUISITOS[p.path]?.(state))
    if (primerPasoIncompleto && primerPasoIncompleto !== pasoActual) {
      return <Navigate to={primerPasoIncompleto.path} replace />
    }
  }

  return (
    <div className="builder-rapido-wizard">
      <div className="wizard-stepper" role="navigation" aria-label="Progreso del builder">
        {PASOS.map((paso, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const isReachable = i === 0 || (PASOS_REQUISITOS[paso.path]?.(state) ?? false)

          return (
            <div
              key={paso.path}
              className={`wizard-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${!isReachable ? 'locked' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="wizard-step-icon">
                <span className="material-symbols-outlined">
                  {isCompleted ? 'check' : paso.icon}
                </span>
              </div>
              <span className="wizard-step-label">{paso.label}</span>
              {i < PASOS.length - 1 && (
                <div className={`wizard-step-connector ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="wizard-content">
        <Outlet />
      </div>

      <div className="wizard-nav">
        {currentIndex > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(PASOS[currentIndex - 1].path)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Atras
          </button>
        )}
        {currentIndex < PASOS.length - 1 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!PASOS_REQUISITOS[PASOS[currentIndex + 1].path]?.(state)}
            onClick={() => navigate(PASOS[currentIndex + 1].path)}
          >
            Siguiente
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function BuilderRapidoWizard() {
  return <WizardContent />
}
