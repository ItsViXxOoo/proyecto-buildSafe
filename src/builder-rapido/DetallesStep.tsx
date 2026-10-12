import { useBuilderRapido, type Prioridad } from '../context/BuilderRapidoContext'

const PRIORIDADES: { valor: Prioridad; label: string; descripcion: string }[] = [
  { valor: 'rendimiento', label: 'Rendimiento', descripcion: 'Máximo poder, sin importar ruido o temperatura' },
  { valor: 'equilibrio', label: 'Equilibrio', descripcion: 'Buen rendimiento con temperaturas y ruido razonables' },
  { valor: 'silencio', label: 'Silencio', descripcion: 'Prioriza refrigeración silenciosa y eficiencia' },
]

export function DetallesStep() {
  const { state, setDetalles } = useBuilderRapido()
  const { detalles } = state

  return (
    <div className="wizard-step-content">
      <h2>Detalles adicionales</h2>
      <p className="wizard-description">
        Personaliza tu build con estas opciones. Afectan los filtros de recomendación.
      </p>

      <div className="detalles-section">
        <h3>Características</h3>
        <div className="detalles-toggles">
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={detalles.rgb}
              onChange={(e) => setDetalles({ rgb: e.target.checked })}
            />
            <span className="toggle-content">
              <span className="material-symbols-outlined">light_mode</span>
              <span>
                <strong>RGB / Iluminación</strong>
                <small>Cases y coolers con iluminación RGB</small>
              </span>
            </span>
          </label>

          <label className="toggle-option">
            <input
              type="checkbox"
              checked={detalles.wifi}
              onChange={(e) => setDetalles({ wifi: e.target.checked })}
            />
            <span className="toggle-content">
              <span className="material-symbols-outlined">wifi</span>
              <span>
                <strong>WiFi integrado</strong>
                <small>Motherboard con WiFi incorporado</small>
              </span>
            </span>
          </label>

          <label className="toggle-option">
            <input
              type="checkbox"
              checked={detalles.overclock}
              onChange={(e) => setDetalles({ overclock: e.target.checked })}
            />
            <span className="toggle-content">
              <span className="material-symbols-outlined">speed</span>
              <span>
                <strong>Overclock</strong>
                <small>CPU desbloqueada y motherboard con chipset Z/X</small>
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="detalles-section">
        <h3>Prioridad de la build</h3>
        <div className="prioridad-grid">
          {PRIORIDADES.map((p) => (
            <button
              key={p.valor}
              type="button"
              className={`prioridad-card ${detalles.prioridad === p.valor ? 'selected' : ''}`}
              onClick={() => setDetalles({ prioridad: p.valor })}
            >
              <span className="prioridad-label">{p.label}</span>
              <span className="prioridad-descripcion">{p.descripcion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
