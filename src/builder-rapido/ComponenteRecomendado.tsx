import type { ComponenteCore } from '../lib/recomendacion-core'

const TIPO_LABELS: Record<string, string> = {
  cpu: 'Procesador',
  motherboard: 'Placa Base',
  ram: 'Memoria RAM',
  gpu: 'Tarjeta Gráfica',
  storage: 'Almacenamiento',
  psu: 'Fuente de Alimentación',
  case: 'Gabinete',
  cooler: 'Refrigeración',
}

interface ComponenteRecomendadoProps {
  componente: ComponenteCore
  tipo: string
  /** Si se entrega, muestra botón "editar" que abre el modal de alternativas */
  onEditar?: () => void
  editado?: boolean
}

export function ComponenteRecomendado({ componente, tipo, onEditar, editado }: ComponenteRecomendadoProps) {
  const label = TIPO_LABELS[tipo] ?? tipo
  const precio = componente.current_price

  return (
    <div className="componente-recomendado-card">
      <div className="componente-recomendado-header">
        <span className="componente-recomendado-tipo">{label}</span>
        <div className="componente-recomendado-header-derecha">
          {editado && (
            <span className="componente-recomendado-editado" title="Componente elegido manualmente">
              <span className="material-symbols-outlined">edit</span>
              manual
            </span>
          )}
          {precio && (
            <span className="componente-recomendado-precio">${precio.toLocaleString()}</span>
          )}
          {onEditar && (
            <button
              type="button"
              className="componente-recomendado-editar"
              onClick={onEditar}
              title={`Cambiar ${label.toLowerCase()}`}
              aria-label={`Cambiar ${label.toLowerCase()}`}
            >
              <span className="material-symbols-outlined">swap_circle</span>
            </button>
          )}
        </div>
      </div>
      <div className="componente-recomendado-body">
        {componente.image_url && (
          <img
            src={componente.image_url}
            alt={componente.name}
            className="componente-recomendado-imagen"
          />
        )}
        <div className="componente-recomendado-info">
          <h4 className="componente-recomendado-nombre">{componente.name}</h4>
          {componente.performance_tier && (
            <span
              className={`componente-recomendado-tier tier-${componente.performance_tier}`}
              title="Nivel de rendimiento relativo dentro de su categoría (1-5)"
            >
              Tier {componente.performance_tier}
            </span>
          )}
          {componente.brand && (
            <span className="componente-recomendado-marca">{componente.brand}</span>
          )}
        </div>
      </div>
    </div>
  )
}
