import { Link } from 'react-router-dom'

const MODOS = [
  {
    id: 'rapido',
    icono: 'bolt',
    titulo: 'Modo Rápido',
    descripcion:
      'Ideal para quienes quieren un PC funcionando sin complicaciones. Cuéntanos tu presupuesto y para qué lo usarás (gaming, diseño, ofimática), y nosotros armamos la mejor configuración.',
    caracteristicas: [
      'Basado en presupuesto objetivo',
      'Optimizado por caso de uso',
      'Listo en menos de 1 minuto',
    ],
    cta: 'Iniciar Modo Rápido',
    ruta: '/builder-rapido/presupuesto',
    recomendado: true,
  },
  {
    id: 'avanzado',
    icono: 'build',
    titulo: 'Modo Avanzado',
    descripcion:
      'Control total para entusiastas. Selecciona cada componente manualmente con nuestra herramienta de validación de compatibilidad en vivo para asegurar que todo encaje a la perfección.',
    caracteristicas: [
      'Selección pieza por pieza',
      'Validación de compatibilidad estricta',
      'Análisis de cuellos de botella',
    ],
    cta: 'Iniciar Modo Avanzado',
    ruta: '/builder-avanzado',
    recomendado: false,
  },
]

const BENEFICIOS = [
  {
    icono: 'verified_user',
    titulo: 'Cero Incompatibilidades',
    descripcion:
      'Nuestro algoritmo cruza miles de datos técnicos (sockets, dimensiones, consumo) para garantizar que tu build funcione sin sorpresas.',
  },
  {
    icono: 'savings',
    titulo: 'Optimización de Presupuesto',
    descripcion:
      'Te ayudamos a invertir tu dinero donde importa, evitando gastar de más en componentes que no necesitas para tu uso específico.',
  },
  {
    icono: 'inventory_2',
    titulo: 'Base de Datos Actualizada',
    descripcion:
      'Contamos con las últimas piezas del mercado, integrando precios y disponibilidad en tiempo real para que siempre tengas opciones.',
  },
]

export function BuilderInfoPage() {
  return (
    <div className="builder-info">
      <section className="builder-info-hero container">
        <h1>Construye tu PC Ideal</h1>
        <p>
          Nuestro PC Builder te ofrece dos caminos para diseñar tu equipo
          perfecto. Ya seas un principiante buscando recomendaciones o un
          experto armando pieza por pieza, BuildSafe garantiza compatibilidad al
          100%.
        </p>
      </section>

      <section className="modos-comparacion container">
        <div className="modos-grid">
          {MODOS.map((modo) => (
            <article
              key={modo.id}
              className={`modo-card ${modo.recomendado ? 'recomendado' : ''}`}
            >
              <div className="modo-icono">
                <span className="material-symbols-outlined">{modo.icono}</span>
              </div>
              <h2>{modo.titulo}</h2>
              <p className="modo-descripcion">{modo.descripcion}</p>
              <ul className="modo-checklist">
                {modo.caracteristicas.map((caracteristica) => (
                  <li key={caracteristica}>
                    <span className="material-symbols-outlined">check_circle</span>
                    {caracteristica}
                  </li>
                ))}
              </ul>
              <Link
                to={modo.ruta}
                className={`btn ${modo.recomendado ? 'btn-primary' : 'btn-outline'} modo-cta`}
              >
                {modo.cta}
                <span className="material-symbols-outlined">
                  {modo.recomendado ? 'arrow_forward' : 'tune'}
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="beneficios-section">
        <div className="container">
          <h2>¿Por qué usar BuildSafe?</h2>
          <div className="beneficios-grid">
            {BENEFICIOS.map((beneficio) => (
              <article key={beneficio.titulo} className="beneficio-card card">
                <span className="material-symbols-outlined beneficio-icono">
                  {beneficio.icono}
                </span>
                <h3>{beneficio.titulo}</h3>
                <p>{beneficio.descripcion}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
