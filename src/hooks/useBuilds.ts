import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth-context'
import type { Tables, TablesInsert } from '../../supabase/database.types'

type Build = Tables<'builds'>
type BuildComponent = Tables<'build_components'>

interface UseBuildsResult {
  builds: Build[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createBuild: (input: { title: string; description?: string }) => Promise<Build>
  deleteBuild: (id: string) => Promise<void>
  setBuildPublic: (id: string, isPublic: boolean) => Promise<void>
  addComponent: (
    buildId: string,
    componentId: string,
    componentTypeId: string,
    priceSnapshot?: number,
  ) => Promise<void>
  removeComponent: (buildComponentId: string) => Promise<void>
  componentsOf: (buildId: string) => Promise<BuildComponent[]>
}

async function fetchBuilds(userId: string) {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return { uid: userId, rows: data ?? [] }
}

export function useBuilds(): UseBuildsResult {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  const [data, setData] = useState<{ uid: string; rows: Build[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const builds = data && userId && data.uid === userId ? data.rows : []
  const loading = authLoading || (userId !== null && data?.uid !== userId)

  useEffect(() => {
    if (!userId) return
    const uid = userId
    let stale = false

    void (async () => {
      try {
        const next = await fetchBuilds(uid)
        if (stale) return
        setData(next)
        setError(null)
      } catch (e) {
        if (stale) return
        setData({ uid, rows: [] })
        setError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      stale = true
    }
  }, [userId])

  const refresh = useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    try {
      const next = await fetchBuilds(userId)
      setData(next)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
    }
  }, [userId])

  const createBuild = useCallback(
    async (input: { title: string; description?: string }) => {
      if (!user) throw new Error('Debes iniciar sesión')
      const row: TablesInsert<'builds'> = {
        user_id: user.id,
        title: input.title,
        description: input.description ?? null,
      }
      const { data: created, error: err } = await supabase
        .from('builds')
        .insert(row)
        .select()
        .single()
      if (err) throw err
      setData((prev) =>
        prev && prev.uid === user.id
          ? { ...prev, rows: [created, ...prev.rows] }
          : { uid: user.id, rows: [created] },
      )
      return created
    },
    [user],
  )

  const deleteBuild = useCallback(
    async (id: string) => {
      if (!userId) throw new Error('Debes iniciar sesión')
      const { error: err } = await supabase
        .from('builds')
        .delete()
        .eq('id', id)
      if (err) throw err
      setData((prev) =>
        prev && prev.uid === userId
          ? { ...prev, rows: prev.rows.filter((b) => b.id !== id) }
          : prev,
      )
    },
    [userId],
  )

  const setBuildPublic = useCallback(
    async (id: string, isPublic: boolean) => {
      if (!userId) throw new Error('Debes iniciar sesión')
      const { error: err } = await supabase
        .from('builds')
        .update({ is_public: isPublic })
        .eq('id', id)
      if (err) throw err
      setData((prev) =>
        prev && prev.uid === userId
          ? {
              ...prev,
              rows: prev.rows.map((b) =>
                b.id === id ? { ...b, is_public: isPublic } : b,
              ),
            }
          : prev,
      )
    },
    [userId],
  )

  const addComponent = useCallback(
    async (
      buildId: string,
      componentId: string,
      componentTypeId: string,
      priceSnapshot?: number,
    ) => {
      const { error: err } = await supabase.from('build_components').insert({
        build_id: buildId,
        component_id: componentId,
        component_type_id: componentTypeId,
        price_snapshot: priceSnapshot ?? null,
      })
      if (err) throw err
    },
    [],
  )

  const removeComponent = useCallback(async (buildComponentId: string) => {
    const { error: err } = await supabase
      .from('build_components')
      .delete()
      .eq('id', buildComponentId)
    if (err) throw err
  }, [])

  const componentsOf = useCallback(async (buildId: string) => {
    const { data: rows, error: err } = await supabase
      .from('build_components')
      .select('*')
      .eq('build_id', buildId)
      .order('created_at')
    if (err) throw err
    return rows ?? []
  }, [])

  return {
    builds,
    loading: loading || refreshing,
    error,
    refresh,
    createBuild,
    deleteBuild,
    setBuildPublic,
    addComponent,
    removeComponent,
    componentsOf,
  }
}
