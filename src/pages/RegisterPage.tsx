import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { authErrorMessage } from '../lib/authErrors'

function passwordScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

const SCORE_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']

export function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const score = useMemo(() => passwordScore(password), [password])

  function validate(): string | null {
    const u = username.trim()
    if (!/^[a-z0-9_]{3,30}$/.test(u)) {
      return 'El username debe tener entre 3 y 30 caracteres (minúsculas, números o guiones bajos).'
    }
    if (!firstName.trim() || !lastName.trim()) {
      return 'Completá tu nombre y apellido.'
    }
    if (!birthDate) {
      return 'Ingresá tu fecha de nacimiento.'
    }
    if (new Date(birthDate) >= new Date(new Date().toDateString())) {
      return 'La fecha de nacimiento debe ser anterior a hoy.'
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (!email.trim()) {
      return 'Ingresá tu email.'
    }
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(authErrorMessage(signUpError))
      return
    }

    if (data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ birth_date: birthDate })
        .eq('id', data.user?.id ?? '')

      if (profileError) {
        console.error('No se pudo guardar birth_date:', profileError)
      }
    }

    setLoading(false)

    if (data.session) {
      navigate('/')
      return
    }

    setSuccess('Revisá tu email para confirmar tu cuenta y luego iniciá sesión.')
  }

  return (
    <div className="page-center">
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="material-symbols-outlined icon" aria-hidden="true">
            computer
          </span>
          <h1>Crear una cuenta</h1>
          <p>Únete a BuildSafe para planificar tu próxima PC.</p>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="username">Nombre de usuario</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="gamer_pro_99"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="helper">
              Entre 3 y 30 caracteres. Solo letras minúsculas, números y guiones
              bajos.
            </p>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="first-name">Nombre</label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                placeholder="Juan"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="last-name">Apellido</label>
              <input
                id="last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Pérez"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="birth-date">Fecha de nacimiento</label>
            <input
              id="birth-date"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <p className="helper">Debe ser una fecha anterior a hoy.</p>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="helper">Te enviaremos un email de confirmación.</p>
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            <div className="strength" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={score >= n ? `on-${score}` : undefined} />
              ))}
            </div>
            <p className="strength-label">{password ? SCORE_LABELS[score] : ''}</p>
            <p className="helper">Mínimo 8 caracteres.</p>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Registrarse'}
          </button>
          <p className="helper" style={{ textAlign: 'center', marginTop: 8 }}>
            Tus credenciales se guardan de forma segura.
          </p>
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
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
