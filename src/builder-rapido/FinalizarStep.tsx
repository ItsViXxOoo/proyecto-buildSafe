import { useBuilderRapido } from '../context/BuilderRapidoContext'
import { useRecomendacion } from '../hooks/useRecomendacion'
import { ComponenteRecomendado } from './ComponenteRecomendado'

const USO_LABELS: Record<string, string> = {
  gaming: 'Gaming',
  oficina: 'Oficina / Productividad',
  edicion: 'Edición de Video',
  streaming: 'Streaming',
}

const RESOLUCION_LABELS: Record<string, string> = {
  '1080p': '1080p Full HD',
  '1440p': '1440p QHD',
  '4k': '4K UHD',
}

export function FinalizarStep() {
  const { state } = useBuilderRapido()
  const { recomendaciones, loading, error, precioTotal } = useRecomendacion()

  return (
    <div className="wizard-step-content">
      <h2>Tu build recomendada</h2>
      <p className="wizard-description">
        Basado en tus respuestas, estos son los componentes que recomendamos.
      </p>

      <div className="resumen-configuracion">
        <h3>Configuración</h3>
        <div className="resumen-grid">
          <div className="resumen-item">
            <span className="resumen-label">Presupuesto</span>
            <span className="resumen-valor">
              ${state.presupuesto?.toLocaleString() ?? '-'}
            </span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Uso</span>
            <span className="resumen-valor">
              {state.uso ? USO_LABELS[state.uso] : '-'}
            </span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Resolución</span>
            <span className="resumen-valor">
              {state.resolucion ? RESOLUCION_LABELS[state.resolucion] : '-'}
            </span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Prioridad</span>
            <span className="resumen-valor">
              {state.detalles.prioridad === 'rendimiento'
                ? 'Rendimiento'
                : state.detalles.prioridad === 'silencio'
                  ? 'Silencio'
                  : 'Equilibrio'}
            </span>
          </div>
        </div>
      </div>

      <div className="recomendacion-total">
        <span>Precio total estimado:</span>
        <span className="recomendacion-precio-total">
          ${precioTotal.toLocaleString()}
        </span>
      </div>

      {loading && (
        <div className="recomendacion-loading">
          <span className="material-symbols-outlined">progress_activity</span>
          <p>Generando recomendaciones...</p>
        </div>
      )}

      {error && (
        <div className="recomendacion-error">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && recomendaciones.length === 0 && (
        <div className="recomendacion-vacia">
          <span className="material-symbols-outlined">search_off</span>
          <p>No encontramos componentes que coincidan con tu configuración.</p>
        </div>
      )}

      {!loading && !error && recomendaciones.length > 0 && (
        <div className="recomendaciones-grid">
          {recomendaciones.map((rec) => (
            <ComponenteRecomendado
              key={rec.componente.id}
              componente={rec.componente}
              tipo={rec.tipo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
