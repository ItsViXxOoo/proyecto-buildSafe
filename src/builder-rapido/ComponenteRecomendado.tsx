import type { KeyboardEvent } from 'react'
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

/** Icono por tipo de componente (placeholders y referencia en el detalle). */
export const TIPO_ICONOS: Record<string, string> = {
  cpu: 'memory',
  motherboard: 'developer_board',
  ram: 'sd_card',
  gpu: 'videogame_asset',
  storage: 'storage',
  psu: 'electrical_services',
  case: 'computer',
  cooler: 'ac_unit',
}

function handleError(e: KeyboardEvent<HTMLElement>) {
  if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
}

interface ComponenteRecomendadoProps {
  componente: ComponenteCore
  tipo: string
  /** Si se entrega, muestra botón "editar" que abre el modal de alternativas */
  onEditar?: () => void
  /** Si se entrega, la card es clipeable y abre el detalle del componente */
  onAbrirDetalle?: () => void
  editado?: boolean
}

export function ComponenteRecomendado({
  componente,
  tipo,
  onEditar,
  onAbrirDetalle,
  editado,
}: ComponenteRecomendadoProps) {
  const label = TIPO_LABELS[tipo] ?? tipo
  const precio = componente.current_price
  const clipeable = typeof onAbrirDetalle === 'function'

  return (
    <article
      className={`componente-recomendado-card${clipeable ? ' clipeable' : ''}`}
      data-id={componente.id}
      onClick={clipeable ? onAbrirDetalle : undefined}
      onKeyDown={clipeable ? handleError : undefined}
      role={clipeable ? 'button' : undefined}
      tabIndex={clipeable ? 0 : undefined}
      aria-label={clipeable ? `Ver detalle de ${label}: ${componente.name}` : undefined}
    >
      <div className="componente-recomendado-header">
        <span className="componente-recomendado-tipo">{label}</span>
        <div className="componente-recomendado-header-derecha">
          {editado && (
            <span className="componente-recomendado-editado" title="Componente elegido manualmente">
              <span className="material-symbols-outlined">edit</span>
              manual
            </span>
          )}
          {precio != null && (
            <span className="componente-recomendado-precio">${precio.toLocaleString()}</span>
          )}
          {onEditar && (
            <button
              type="button"
              className="componente-recomendado-editar"
              onClick={(e) => {
                e.stopPropagation()
                onEditar()
              }}
              title={`Cambiar ${label.toLowerCase()}`}
              aria-label={`Cambiar ${label.toLowerCase()}`}
            >
              <span className="material-symbols-outlined">change_circle</span>
              Cambiar
            </button>
          )}
        </div>
      </div>
      <div className="componente-recomendado-body">
        {componente.image_url ? (
          <img
            src={componente.image_url}
            alt={componente.name}
            className="componente-recomendado-imagen"
            loading="lazy"
          />
        ) : (
          <div className="componente-recomendado-imagen componente-recomendado-imagen-fallback" aria-hidden="true">
            <span className="material-symbols-outlined">{TIPO_ICONOS[tipo] ?? 'computer'}</span>
          </div>
        )}
        <div className="componente-recomendado-info">
          <h4 className="componente-recomendado-nombre">{componente.name}</h4>
          <div className="componente-recomendado-tags">
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
    </article>
  )
}
