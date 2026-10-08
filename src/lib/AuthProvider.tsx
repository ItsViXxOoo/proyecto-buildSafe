import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<null | Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >['data']['session']>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    let stale = false

    void supabase.auth.getSession().then(({ data }) => {
      if (stale) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (stale) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      stale = true
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, toast, showToast }}
    >
      {children}
    </AuthContext.Provider>
  )
}
