import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

const NAV_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/', label: 'PC Builder' },
  { to: '/', label: 'Montajes' },
  { to: '/', label: 'Guías' },
  { to: '/', label: 'Comparador' },
  { to: '/', label: 'Simulador' },
]

function getInitials(user: User): string {
  const fullName = user.user_metadata?.full_name as string | undefined
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0]?.toUpperCase() ?? 'U'
  }
  return user.email?.[0]?.toUpperCase() ?? 'U'
}

export function Header() {
  const { user, loading, toast } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    try {
      setLogoutError(null)
      await supabase.auth.signOut()
    } catch {
      setLogoutError('No se pudo cerrar sesión')
    }
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
                {getInitials(user)}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm logout-btn"
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
              {logoutError && <span className="error-text">{logoutError}</span>}
            </>
          )}
          {toast && <div className="toast-success">{toast}</div>}
        </div>
      </div>
    </header>
  )
}
