import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuilderRapido } from '../context/BuilderRapidoContext'
import { useRecomendacion } from '../hooks/useRecomendacion'
import { useBuilds } from '../hooks/useBuilds'
import { useCompatibility } from '../hooks/useCompatibility'
import { useAuth } from '../lib/auth-context'
import { ComponenteRecomendado } from './ComponenteRecomendado'
import { ModalEditarComponente } from './ModalEditarComponente'
import { PanelCompatibilidad, type CompatPart } from './PanelCompatibilidad'
import type { RecomendacionItem } from '../lib/recomendacion-core'

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

const PRIORIDAD_LABELS: Record<string, string> = {
  rendimiento: 'Rendimiento',
  silencio: 'Silencio',
  equilibrio: 'Equilibrio',
}

export function FinalizarStep() {
  const { state, setOverride } = useBuilderRapido()
  const navigate = useNavigate()
  const { user, showToast } = useAuth()
  const { recomendaciones, loading, error, precioTotal, alternativas } = useRecomendacion()
  const { createBuild, addComponent } = useBuilds()
  const { check: checkYGuardarCompat } = useCompatibility()

  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState<{ id: string; title: string } | null>(null)
  const [guardarError, setGuardarError] = useState<string | null>(null)
  const [modalTipo, setModalTipo] = useState<RecomendacionItem | null>(null)

  const abrirDetalle = (id: string) =>
    navigate(`/componente/${id}?flujo=modo-rapido&volver=/builder-rapido/finalizar`)

  // Añadido desde el detalle: aplica el override pendiente y limpia la señal
  useEffect(() => {
    const pendiente = sessionStorage.getItem('modo_rapido_override')
    if (!pendiente) return
    try {
      const { slug, id } = JSON.parse(pendiente) as { slug: string; id: string }
      if (slug && id) setOverride(slug, id)
    } catch {
      /* señal inválida: se ignora */
    }
    sessionStorage.removeItem('modo_rapido_override')
  }, [setOverride])

  async function guardarBuild() {
    if (!user || !state.uso || recomendaciones.length === 0) return
    setGuardando(true)
    setGuardarError(null)
    try {
      const fecha = new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const titulo = `Modo Rápido · ${USO_LABELS[state.uso]} · $${(state.presupuesto ?? 0).toLocaleString()} (${fecha})`
      const build = await createBuild({
        title: titulo,
        description: `Modo Rápido · Presupuesto $${(state.presupuesto ?? 0).toLocaleString()} · ${RESOLUCION_LABELS[state.resolucion ?? '1080p'] ?? ''} · ${PRIORIDAD_LABELS[state.detalles.prioridad]}`,
      })
      for (const rec of recomendaciones) {
        await addComponent(
          build.id,
          rec.componente.id,
          rec.componente.type_id,
          rec.componente.current_price ?? undefined,
        )
      }
      // Persiste los resultados de compatibilidad del build guardado
      await checkYGuardarCompat(build.id)
      setGuardada({ id: build.id, title: titulo })
      showToast('Build guardada correctamente')
    } catch (e) {
      setGuardarError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  function exportar(formato: 'csv' | 'json') {
    if (recomendaciones.length === 0) return
    const fechaISO = new Date().toISOString().slice(0, 10)
    let contenido: string
    let mime: string
    let nombre: string

    if (formato === 'csv') {
      const lineas: string[] = [['tipo', 'componente', 'marca', 'precio_usd', 'tier'].join(',')]
      for (const rec of recomendaciones) {
        const nombreComp = rec.componente.name.replaceAll('"', "'")
        const marca = rec.componente.brand ?? ''
        const precio = rec.componente.current_price?.toFixed(2) ?? ''
        const tier = rec.componente.performance_tier ?? ''
        lineas.push([rec.tipo, `"${nombreComp}"`, marca, precio, tier].join(','))
      }
      lineas.push(`total,,,${precioTotal.toFixed(2)},`)
      contenido = '\uFEFF' + lineas.join('\r\n')
      mime = 'text/csv;charset=utf-8'
      nombre = `buildsafe-modo-rapido-${fechaISO}.csv`
    } else {
      const data = {
        generado: fechaISO,
        configuracion: {
          presupuesto: state.presupuesto,
          uso: state.uso,
          resolucion: state.resolucion,
          detalles: state.detalles,
        },
        precioTotal,
        componentes: recomendaciones.map((rec) => ({
          tipo: rec.tipo,
          tipoSlug: rec.tipoSlug,
          id: rec.componente.id,
          nombre: rec.componente.name,
          marca: rec.componente.brand,
          precio: rec.componente.current_price,
          tier: rec.componente.performance_tier,
        })),
      }
      contenido = JSON.stringify(data, null, 2)
      mime = 'application/json'
      nombre = `buildsafe-modo-rapido-${fechaISO}.json`
    }

    const blob = new Blob([contenido], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    URL.revokeObjectURL(url)
  }

  const parts: CompatPart[] = recomendaciones.map((r) => ({ id: r.componente.id, quantity: 1 }))

  return (
    <div className="wizard-step-content">
      <h2>Tu build recomendada</h2>
      <p className="wizard-description">
        Basado en tus respuestas, estos son los componentes que recomendamos. Puedes cambiar
        cualquiera con el botón de cambio, y revisaremos la compatibilidad al instante.
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
              {PRIORIDAD_LABELS[state.detalles.prioridad]}
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
          <span className="material-symbols-outlined icon-spin">autorenew</span>
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
              key={`${rec.tipoSlug}-${rec.componente.id}`}
              componente={rec.componente}
              tipo={rec.tipo}
              editado={state.overrides[rec.tipoSlug] === rec.componente.id}
              onEditar={() => setModalTipo(rec)}
              onAbrirDetalle={() => abrirDetalle(rec.componente.id)}
            />
          ))}
        </div>
      )}

      {recomendaciones.length > 0 && <PanelCompatibilidad parts={parts} />}

      {recomendaciones.length > 0 && (
        <div className="finalizar-toolbar">
          <button
            type="button"
            className="finalizar-boton finalizar-boton-primario"
            onClick={guardarBuild}
            disabled={guardando || !user}
          >
            <span className={`material-symbols-outlined${guardando ? ' icon-spin' : ''}`}>
              {guardando ? 'autorenew' : 'save'}
            </span>
            {guardando ? 'Guardando...' : 'Guardar build'}
          </button>
          {!user && <span className="finalizar-login-hint">Inicia sesión para guardar tu build</span>}
          <button
            type="button"
            className="finalizar-boton"
            onClick={() => exportar('csv')}
          >
            <span className="material-symbols-outlined">table_view</span>
            Exportar CSV
          </button>
          <button
            type="button"
            className="finalizar-boton"
            onClick={() => exportar('json')}
          >
            <span className="material-symbols-outlined">data_object</span>
            Exportar JSON
          </button>
        </div>
      )}

      {guardada && (
        <div className="finalizar-guardada">
          <span className="material-symbols-outlined">check_circle</span>
          <p>
            <strong>{guardada.title}</strong> guardada correctamente. El resultado de compatibilidad
            quedó registrado en tu build.
          </p>
        </div>
      )}

      {guardarError && (
        <div className="finalizar-error">
          <span className="material-symbols-outlined">error</span>
          <p>No se pudo guardar: {guardarError}</p>
        </div>
      )}

      {modalTipo && (
        <ModalEditarComponente
          tipoSlug={modalTipo.tipoSlug}
          tipoLabel={modalTipo.tipo}
          componenteActualId={modalTipo.componente.id}
          alternativas={alternativas(modalTipo.tipoSlug)}
          onElegir={(id) => {
            setOverride(modalTipo.tipoSlug, id)
            setModalTipo(null)
          }}
          onCerrar={() => setModalTipo(null)}
          onVerDetalle={abrirDetalle}
        />
      )}
    </div>
  )
}
