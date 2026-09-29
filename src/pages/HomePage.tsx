export function HomePage() {
  return (
    <div className="home">
      <section className="hero container">
        <div className="hero-copy">
          <span className="badge">100% Compatibilidad Garantizada</span>
          <h1>Arma tu PC sin miedo</h1>
          <p>
            La herramienta definitiva para diseñar, comparar y simular tu
            próximo ordenador. Olvídate de cuellos de botella y asegúrate de la
            compatibilidad total de cada componente antes de comprar.
          </p>
          <div className="hero-actions">
            <a href="/registro" className="btn btn-primary">
              Comenzar mi build ahora
            </a>
            <a href="#como-funciona" className="btn btn-ghost">
              Ver demo
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="pc-frame" aria-hidden="true">
            <span className="material-symbols-outlined">computer</span>
          </div>
          <div className="compat-card">
            <span className="compat-dot" />
            <div>
              <strong>Build Compatible</strong>
              <span>0 advertencias detectadas</span>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="section container">
        <h2>¿Cómo funciona?</h2>
        <p className="section-lead">
          Diseña tu equipo en tres pasos simples, guiado por nuestro motor de
          compatibilidad en tiempo real.
        </p>
        <div className="steps">
          <article className="step card">
            <span className="material-symbols-outlined">widgets</span>
            <h3>Elegí tus componentes</h3>
            <p>
              Seleccioná procesador, placa, memoria, GPU y más desde nuestro
              catálogo verificado.
            </p>
          </article>
          <article className="step card">
            <span className="material-symbols-outlined">rule</span>
            <h3>Validación automática</h3>
            <p>
              Nuestro motor detecta incompatibilidades de socket, chipset,
              PSU y refrigeración al instante.
            </p>
          </article>
          <article className="step card">
            <span className="material-symbols-outlined">shopping_cart</span>
            <h3>Compará y comprá</h3>
            <p>
              Revisá precios, alternativas y llevá tu build lista para
              comprar con confianza.
            </p>
          </article>
        </div>
      </section>

      <section className="section container">
        <div className="help-card card">
          <span className="material-symbols-outlined">help</span>
          <h2>¿Dudas técnicas?</h2>
          <p>
            Visite nuestro centro de ayuda para encontrar respuestas rápidas
            sobre compatibilidad, instalación y configuración.
          </p>
          <a href="#" className="btn btn-primary">
            Ir al centro de ayuda
          </a>
        </div>
      </section>
    </div>
  )
}
