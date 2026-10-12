import { useBuilderRapido, type UsoPrincipal } from '../context/BuilderRapidoContext'

const USOS: { valor: UsoPrincipal; label: string; icon: string; descripcion: string; implicacion: string }[] = [
  {
    valor: 'gaming',
    label: 'Gaming',
    icon: 'sports_esports',
    descripcion: 'Jugar videojuegos con altos FPS',
    implicacion: 'Prioriza GPU y CPU de alto rendimiento',
  },
  {
    valor: 'oficina',
    label: 'Oficina / Productividad',
    icon: 'business_center',
    descripcion: 'Trabajo, navegación, multitarea',
    implicacion: 'Prioriza CPU, RAM y silencio',
  },
  {
    valor: 'edicion',
    label: 'Edición de Video',
    icon: 'movie',
    descripcion: 'Edición de video, renderizado 3D',
    implicacion: 'Prioriza CPU cores, RAM y almacenamiento rápido',
  },
  {
    valor: 'streaming',
    label: 'Streaming',
    icon: 'live_tv',
    descripcion: 'Transmisión en vivo y contenido',
    implicacion: 'Equilibrio CPU/GPU para codificación',
  },
]

export function UsoStep() {
  const { state, setUso } = useBuilderRapido()

  return (
    <div className="wizard-step-content">
      <h2>¿Para qué usarás tu PC?</h2>
      <p className="wizard-description">
        Selecciona el uso principal. Esto nos ayuda a priorizar los componentes adecuados.
      </p>

      <div className="uso-grid">
        {USOS.map((uso) => (
          <button
            key={uso.valor}
            type="button"
            className={`uso-card ${state.uso === uso.valor ? 'selected' : ''}`}
            onClick={() => setUso(uso.valor)}
          >
            <span className="material-symbols-outlined uso-icon">{uso.icon}</span>
            <span className="uso-label">{uso.label}</span>
            <span className="uso-descripcion">{uso.descripcion}</span>
            <span className="uso-implicacion">{uso.implicacion}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
