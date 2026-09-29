const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'user already registered': 'Ese email ya está registrado.',
  'User already registered': 'Ese email ya está registrado.',
  'Password should be at least 6 characters.':
    'La contraseña debe tener al menos 8 caracteres.',
  'Email not confirmed': 'Tu email aún no fue confirmado. Revisá tu bandeja.',
  'Signup requires a valid password': 'Ingresá una contraseña válida.',
  'Unable to validate email address: invalid format':
    'El formato del email no es válido.',
  'Anonymous sign-ins are disabled': 'El registro está temporalmente deshabilitado.',
}

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    if (MESSAGES[message]) return MESSAGES[message]
    if (/already registered/i.test(message)) return MESSAGES['user already registered']
    return message
  }
  return 'Ocurrió un error. Intentá de nuevo.'
}
