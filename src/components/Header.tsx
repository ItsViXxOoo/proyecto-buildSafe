import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { supabase } from '../lib/supabase'

const NAV_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/', label: 'PC Builder' },
  { to: '/', label: 'Montajes' },
  { to: '/', label: 'Guías' },
  { to: '/', label: 'Comparador' },
  { to: '/', label: 'Simulador' },
]

export function Header() {
  const { user, loading } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <div className="site-header-left">
          <Link to="/" className="brand">
            <span className="material-symbols-outlined" aria-hidden="true">
              computer
            </span>
            <span>BuildSafe</span>
          </Link>
          <nav className="site-nav" aria-label="Principal">
            {NAV_LINKS.map((item, i) => (
              <NavLink
                key={`${item.label}-${i}`}
                to={item.to}
                className={({ isActive }) =>
                  isActive && i === 0 ? 'active' : undefined
                }
                end={i === 0}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="site-header-right">
          {!loading && !user && (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="btn btn-primary btn-sm">
                Crear cuenta
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              <span className="user-chip" title={user.email ?? ''}>
                {(user.user_metadata?.full_name ||
                  user.email ||
                  'U')
                  .toString()
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Salir
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
