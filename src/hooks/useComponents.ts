import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../../supabase/database.types'

type Component = Tables<'components'>
type ComponentType = Tables<'component_types'>

interface UseComponentsResult {
  types: ComponentType[]
  components: Component[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

async function fetchAll(typeSlug?: string) {
  const [typesRes, compsRes] = await Promise.all([
    supabase.from('component_types').select('*').order('name'),
    (async () => {
      let query = supabase
        .from('components')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (typeSlug) {
        const { data: typeRow, error: typeErr } = await supabase
          .from('component_types')
          .select('id')
          .eq('slug', typeSlug)
          .single()
        if (typeErr) throw typeErr
        query = query.eq('type_id', typeRow.id)
      }
      return query
    })(),
  ])

  if (typesRes.error) throw typesRes.error
  if (compsRes.error) throw compsRes.error

  return {
    types: typesRes.data ?? [],
    components: compsRes.data ?? [],
  }
}

export function useComponents(typeSlug?: string): UseComponentsResult {
  const [types, setTypes] = useState<ComponentType[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const key = typeSlug ?? ''
  const loading = loadedFor !== key

  useEffect(() => {
    let stale = false

    void (async () => {
      try {
        const data = await fetchAll(typeSlug)
        if (stale) return
        setTypes(data.types)
        setComponents(data.components)
        setError(null)
        setLoadedFor(key)
      } catch (e) {
        if (stale) return
        setError(e instanceof Error ? e.message : String(e))
        setLoadedFor(key)
      }
    })()

    return () => {
      stale = true
    }
  }, [typeSlug, key])

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAll(typeSlug)
      setTypes(data.types)
      setComponents(data.components)
      setError(null)
      setLoadedFor(key)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [typeSlug, key])

  return { types, components, loading, error, refresh }
}
