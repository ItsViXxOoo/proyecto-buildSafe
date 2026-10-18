import { useEffect, useMemo, useState } from 'react'

type Alternativa = {
  id: string
  name: string
  brand: string | null
  current_price: number | null
  performance_tier: number | null
  image_url?: string | null
}

interface ModalEditarComponenteProps {
  tipoSlug: string
  tipoLabel: string
  componenteActualId: string
  alternativas: Alternativa[]
  onElegir: (id: string) => void
  onCerrar: () => void
  /** Si se entrega, cada fila muestra botón para ver el detalle del componente */
  onVerDetalle?: (id: string) => void
}

/**
 * Modal con las alternativas activas de un tipo de componente.
 * Recibe la lista ya cargada por el hook de recomendación (sin nuevas queries).
 */
export function ModalEditarComponente({
  tipoSlug,
  tipoLabel,
  componenteActualId,
  alternativas,
  onElegir,
  onCerrar,
  onVerDetalle,
}: ModalEditarComponenteProps) {
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return alternativas
      .filter((c) => !q || `${c.name} ${c.brand ?? ''}`.toLowerCase().includes(q))
      .slice(0, 60)
  }, [alternativas, busqueda])

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Cambiar ${tipoLabel}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="modal-card" data-tipo={tipoSlug}>
        <div className="modal-header">
          <div>
            <h3>Cambiar {tipoLabel.toLowerCase()}</h3>
            <p>Opciones compatibles con tu configuración (ordenadas por precio)</p>
          </div>
          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-busqueda">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            autoFocus
          />
        </div>

        <div className="modal-lista">
          {lista.length === 0 && (
            <p className="modal-vacio">Sin resultados para "{busqueda}".</p>
          )}
          {lista.map((c) => (
            <div
              key={c.id}
              className={`modal-item${c.id === componenteActualId ? ' modal-item-actual' : ''}`}
            >
              <button
                type="button"
                className="modal-item-principal"
                onClick={() => onElegir(c.id)}
                disabled={c.id === componenteActualId}
              >
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="modal-item-foto" loading="lazy" />
                ) : (
                  <span className="modal-item-foto modal-item-foto-fallback" aria-hidden="true">
                    <span className="material-symbols-outlined">computer</span>
                  </span>
                )}
                <span className="modal-item-info">
                  <span className="modal-item-nombre">{c.name}</span>
                  <span className="modal-item-meta">
                    {c.brand && <span>{c.brand}</span>}
                    {c.performance_tier && (
                      <span className={`modal-item-tier tier-${c.performance_tier}`}>
                        Tier {c.performance_tier}
                      </span>
                    )}
                  </span>
                </span>
                <span className="modal-item-precio">
                  {c.current_price != null ? `$${c.current_price.toLocaleString()}` : '—'}
                </span>
              </button>
              {onVerDetalle && (
                <button
                  type="button"
                  className="modal-item-detalle"
                  title="Ver especificaciones"
                  aria-label={`Ver detalle de ${c.name}`}
                  onClick={() => onVerDetalle(c.id)}
                >
                  <span className="material-symbols-outlined">info</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
