import { useEffect, useState } from 'react'
import { useCompatibility } from '../hooks/useCompatibility'

export type CompatPart = { id: string; quantity?: number }

type CheckRow = {
  message: string
  rule_id: string | null
  severity: string
}

/**
 * Panel de compatibilidad en vivo (Modo Rápido): valida la combinación actual
 * contra el motor SQL vía `preview_build_compatibility`, sin persistir nada.
 */
export function PanelCompatibilidad({ parts }: { parts: CompatPart[] }) {
  const { preview, checking, error } = useCompatibility()
  const [resultados, setResultados] = useState<CheckRow[]>([])

  const clave = parts.map((p) => `${p.id}:${p.quantity ?? 1}`).join('|')

  useEffect(() => {
    if (parts.length === 0) {
      setResultados([])
      return
    }
    let stale = false
    preview(parts)
      .then((rows) => {
        if (!stale) setResultados(rows)
      })
      .catch(() => {
        if (!stale) setResultados([])
      })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const errores = resultados.filter((r) => r.severity === 'error')
  const advertencias = resultados.filter((r) => r.severity === 'warning')
  const totalAvisos = errores.length + advertencias.length

  return (
    <div className="compat-panel">
      <div className="compat-panel-header">
        <span className="material-symbols-outlined">fact_check</span>
        <h3>Compatibilidad</h3>
        {checking && (
          <span className="material-symbols-outlined compat-chequeando">progress_activity</span>
        )}
      </div>

      {error && (
        <div className="compat-row-warning">
          <span className="material-symbols-outlined">warning</span>
          <p>No pudimos validar la compatibilidad en este momento.</p>
        </div>
      )}

      {!checking && !error && resultados.length === 0 && (
        <div className="compat-ok">
          <span className="material-symbols-outlined">check_circle</span>
          <p>Sin problemas de compatibilidad detectados.</p>
        </div>
      )}

      {resultados
        .filter((r) => r.severity === 'error')
        .map((r, i) => (
          <div key={`e${i}`} className="compat-row-error">
            <span className="material-symbols-outlined">error</span>
            <p>{r.message}</p>
          </div>
        ))}

      {resultados
        .filter((r) => r.severity === 'warning')
        .map((r, i) => (
          <div key={`w${i}`} className="compat-row-warning">
            <span className="material-symbols-outlined">warning</span>
            <p>{r.message}</p>
          </div>
        ))}

      {!error && resultados.length > 0 && (
        <p className="compat-resumen">
          {totalAvisos} aviso{totalAvisos !== 1 ? 's' : ''} ·{' '}
          {errores.length > 0
            ? 'corrige los errores antes de guardar.'
            : advertencias.length > 0
              ? 'la build funciona, pero revisa los avisos.'
              : 'todo en orden.'}
        </p>
      )}
    </div>
  )
}
