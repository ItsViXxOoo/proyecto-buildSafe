import { useBuilderRapido } from '../context/BuilderRapidoContext'

const QUICK_PICKS = [
  { label: 'Económico', valor: 500, descripcion: 'PC básica para oficina y navegación' },
  { label: 'Equilibrado', valor: 1000, descripcion: 'Gaming 1080p y productividad' },
  { label: 'Gaming', valor: 1800, descripcion: 'Gaming 1440p de alto nivel' },
  { label: 'Entusiasta', valor: 3000, descripcion: 'Gaming 4K y workstation' },
]

export function PresupuestoStep() {
  const { state, setPresupuesto } = useBuilderRapido()
  const valor = state.presupuesto ?? 1000

  return (
    <div className="wizard-step-content">
      <h2>¿Cuál es tu presupuesto?</h2>
      <p className="wizard-description">
        Define cuánto quieres gastar en tu PC. Te recomendaremos componentes que se ajusten a tu rango.
      </p>

      <div className="presupuesto-slider-container">
        <div className="presupuesto-display">
          <span className="presupuesto-currency">$</span>
          <input
            type="number"
            className="presupuesto-input"
            value={valor}
            min={300}
            max={5000}
            step={50}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v >= 300 && v <= 5000) setPresupuesto(v)
            }}
            aria-label="Presupuesto en dólares"
          />
        </div>
        <input
          type="range"
          className="presupuesto-slider"
          min={300}
          max={5000}
          step={50}
          value={valor}
          onChange={(e) => setPresupuesto(Number(e.target.value))}
          aria-label="Slider de presupuesto"
        />
        <div className="presupuesto-range-labels">
          <span>$300</span>
          <span>$5,000</span>
        </div>
      </div>

      <div className="quick-picks">
        <h3>Presupuestos populares</h3>
        <div className="quick-picks-grid">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.label}
              type="button"
              className={`quick-pick-card ${valor === pick.valor ? 'selected' : ''}`}
              onClick={() => setPresupuesto(pick.valor)}
            >
              <span className="quick-pick-label">{pick.label}</span>
              <span className="quick-pick-valor">${pick.valor.toLocaleString()}</span>
              <span className="quick-pick-descripcion">{pick.descripcion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
