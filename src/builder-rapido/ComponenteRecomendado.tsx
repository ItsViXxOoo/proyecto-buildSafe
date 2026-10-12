import type { Tables } from '../../supabase/database.types'

type Component = Tables<'components'>

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
  componente: Component
  tipo: string
}

export function ComponenteRecomendado({ componente, tipo }: ComponenteRecomendadoProps) {
  const label = TIPO_LABELS[tipo] ?? tipo
  const precio = componente.current_price

  return (
    <div className="componente-recomendado-card">
      <div className="componente-recomendado-header">
        <span className="componente-recomendado-tipo">{label}</span>
        {precio && (
          <span className="componente-recomendado-precio">${precio.toLocaleString()}</span>
        )}
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
          {componente.brand && (
            <span className="componente-recomendado-marca">{componente.brand}</span>
          )}
        </div>
      </div>
    </div>
  )
}
