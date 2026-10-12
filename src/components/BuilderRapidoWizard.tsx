import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BuilderRapidoProvider, useBuilderRapido } from '../context/BuilderRapidoContext'

const PASOS = [
  { path: 'presupuesto', label: 'Presupuesto', icon: 'payments' },
  { path: 'uso', label: 'Uso', icon: 'sports_esports' },
  { path: 'resolucion', label: 'Resolución', icon: 'monitor' },
  { path: 'detalles', label: 'Detalles', icon: 'tune' },
  { path: 'finalizar', label: 'Finalizar', icon: 'check_circle' },
] as const

const PASOS_REQUISITOS: Record<string, (state: ReturnType<typeof useBuilderRapido>['state']) => boolean> = {
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

  const currentIndex = PASOS.findIndex(
    (p) => location.pathname.endsWith(p.path),
  )

  if (currentIndex === -1) {
    return <Navigate to="presupuesto" replace />
  }

  const pasoActual = PASOS[currentIndex]
  const requisito = PASOS_REQUISITOS[pasoActual.path]
  if (requisito && !requisito(state)) {
    const primerPasoIncompleto = PASOS.find((p) => {
      const req = PASOS_REQUISITOS[p.path]
      return req && !req(state)
    })
    if (primerPasoIncompleto) {
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
  return (
    <BuilderRapidoProvider>
      <WizardContent />
    </BuilderRapidoProvider>
  )
}
