import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMyResources, RESOURCES_EVENT } from '@/services/resources'

const EMPTY = { bricks: 0, timber: 0, rare_gem: 0, stone: 0, iron: 0, glass: 0, crystal_shard: 0, fabric: 0 }

/**
 * Reactive build-material inventory: { bricks, timber, rare_gem, stone,
 * iron, glass, crystal_shard, fabric, loading, refresh }.
 * Refetches on sign-in/out and whenever a build/buy action fires
 * RESOURCES_EVENT. Degrades to zeros (not errors) when the 004 migration
 * hasn't been run yet.
 */
export function usePlayerResources() {
    const { user } = useAuth()
    const [resources, setResources] = useState(EMPTY)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!user) {
            setResources(EMPTY)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const row = await getMyResources()
            setResources(row ? { ...EMPTY, ...row } : EMPTY)
        } catch (e) {
            console.error('[resources] refresh failed:', e.message)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyResources()
            .then(row => {
                if (cancelled) return
                setResources(row ? { ...EMPTY, ...row } : EMPTY)
            })
            .catch(e => console.error('[resources] refresh failed:', e.message))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user])

    useEffect(() => {
        window.addEventListener(RESOURCES_EVENT, refresh)
        return () => window.removeEventListener(RESOURCES_EVENT, refresh)
    }, [refresh])

    return { ...resources, loading: user ? loading : false, refresh }
}
