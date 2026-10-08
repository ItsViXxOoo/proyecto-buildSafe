import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authErrors'
import { useAuth } from '../lib/auth-context'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useAuth()
  const errorRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string })?.from ?? '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (err) {
      setError(authErrorMessage(err))
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
    showToast('Sesión iniciada correctamente')
    navigate(from, { replace: true })
  }

  return (
    <div className="page-center">
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="material-symbols-outlined icon" aria-hidden="true">
            computer
          </span>
          <h1>Iniciar sesión</h1>
          <p>Accedé a tus proyectos y configuraciones guardadas.</p>
        </div>

        {error && <div ref={errorRef} className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ejemplo@correo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="divider">O continúa con</div>
        <div className="oauth-row">
          <button type="button" className="btn" disabled>
            Google
          </button>
          <button type="button" className="btn" disabled>
            Apple
          </button>
        </div>

        <p className="auth-footer-link">
          ¿No tienes una cuenta?{' '}
          <Link to="/registro">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  )
}
