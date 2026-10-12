import { useBuilderRapido, type Resolucion } from '../context/BuilderRapidoContext'

const RESOLUCIONES: { valor: Resolucion; label: string; descripcion: string; rendimiento: string }[] = [
  {
    valor: '1080p',
    label: '1080p Full HD',
    descripcion: '1920 x 1080 píxeles',
    rendimiento: '60+ FPS en altos / 144+ FPS en medios',
  },
  {
    valor: '1440p',
    label: '1440p QHD',
    descripcion: '2560 x 1440 píxeles',
    rendimiento: '60+ FPS en altos / 100+ FPS en medios',
  },
  {
    valor: '4k',
    label: '4K UHD',
    descripcion: '3840 x 2160 píxeles',
    rendimiento: '60+ FPS en medios / 30+ FPS en altos',
  },
]

export function ResolucionStep() {
  const { state, setResolucion } = useBuilderRapido()

  return (
    <div className="wizard-step-content">
      <h2>¿Qué resolución necesitas?</h2>
      <p className="wizard-description">
        La resolución de tu monitor determina qué tan potente debe ser tu GPU y CPU.
      </p>

      <div className="resolucion-grid">
        {RESOLUCIONES.map((res) => (
          <button
            key={res.valor}
            type="button"
            className={`resolucion-card ${state.resolucion === res.valor ? 'selected' : ''}`}
            onClick={() => setResolucion(res.valor)}
          >
            <span className="material-symbols-outlined resolucion-icon">monitor</span>
            <span className="resolucion-label">{res.label}</span>
            <span className="resolucion-descripcion">{res.descripcion}</span>
            <span className="resolucion-rendimiento">{res.rendimiento}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
