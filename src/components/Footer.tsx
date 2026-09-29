import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    title: 'Plataforma',
    links: ['PC Builder', 'Montajes', 'Comparador', 'Simulador'],
  },
  {
    title: 'Recursos',
    links: ['Guías', 'Blog', 'Centro de ayuda', 'FAQ'],
  },
  {
    title: 'Comunidad',
    links: ['Montajes de la comunidad', 'Perfil público', 'Notificaciones'],
  },
  {
    title: 'Soporte',
    links: ['Contacto', 'Términos', 'Privacidad'],
  },
  {
    title: 'Compañía',
    links: ['Centro de ayuda', 'Contacto', 'FAQ', 'Términos', 'Privacidad'],
  },
]

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-grid">
        <div className="site-footer-brand">
          <Link to="/" className="brand">
            <span className="material-symbols-outlined" aria-hidden="true">
              computer
            </span>
            <span>BuildSafe</span>
          </Link>
          <p>
            La plataforma más precisa para diseñar y validar tu PC personalizado.
          </p>
          <p className="copyright">
            © 2024 BuildSafe. Todos los derechos reservados.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="site-footer-col">
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((label) => (
                <li key={label}>
                  <a href="#">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
