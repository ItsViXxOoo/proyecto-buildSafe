import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../../supabase/database.types'

type CompatResult = Tables<'build_compatibility_results'>

type CheckRow = {
  message: string
  rule_id: string
  severity: string
}

/** Parte de un build en preview: componente + cantidad */
type CompatPart = { id: string; quantity?: number }

interface UseCompatibilityResult {
  checking: boolean
  error: string | null
  results: CompatResult[]
  check: (buildId: string) => Promise<CompatResult[]>
  checkOnly: (buildId: string) => Promise<CheckRow[]>
  /** Valida una combinación de componentes SIN persistir nada (Modo Rápido). */
  preview: (parts: CompatPart[]) => Promise<CheckRow[]>
}

export function useCompatibility(): UseCompatibilityResult {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<CompatResult[]>([])

  const checkOnly = useCallback(async (buildId: string) => {
    setChecking(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc(
        'check_build_compatibility',
        { p_build_id: buildId },
      )
      if (err) throw err
      return (data ?? []) as CheckRow[]
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setChecking(false)
    }
  }, [])

  const preview = useCallback(async (parts: CompatPart[]) => {
    setChecking(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc(
        'preview_build_compatibility',
        { p_parts: parts.map((p) => ({ id: p.id, quantity: p.quantity ?? 1 })) },
      )
      if (err) throw err
      return (data ?? []) as CheckRow[]
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setChecking(false)
    }
  }, [])

  const check = useCallback(
    async (buildId: string) => {
      setChecking(true)
      setError(null)
      try {
        const { data, error: err } = await supabase.rpc(
          'save_build_compatibility_results',
          { p_build_id: buildId },
        )
        if (err) throw err
        const rows = (data ?? []) as CompatResult[]
        setResults(rows)
        return rows
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        throw e
      } finally {
        setChecking(false)
      }
    },
    [],
  )

  return { checking, error, results, check, checkOnly, preview }
}
