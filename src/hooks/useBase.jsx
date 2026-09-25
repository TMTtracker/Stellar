import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMyBase, BASE_EVENT } from '@/services/base'

const DEFAULT_BASE = { base_level: 1, pos_x: 0, pos_y: 0, rotation: 0 }

/**
 * Reactive home-base state: { base_level, pos_x, pos_y, rotation, loading,
 * refresh }. Refetches on sign-in/out and whenever an upgrade/move/rotate
 * fires BASE_EVENT.
 */
export function useBase() {
    const { user } = useAuth()
    const [base, setBase] = useState(DEFAULT_BASE)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!user) {
            setBase(DEFAULT_BASE)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const row = await getMyBase()
            setBase(row ? { ...DEFAULT_BASE, ...row } : DEFAULT_BASE)
        } catch (e) {
            console.error('[base] refresh failed:', e.message)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyBase()
            .then(row => {
                if (cancelled) return
                setBase(row ? { ...DEFAULT_BASE, ...row } : DEFAULT_BASE)
            })
            .catch(e => console.error('[base] refresh failed:', e.message))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user])

    useEffect(() => {
        window.addEventListener(BASE_EVENT, refresh)
        return () => window.removeEventListener(BASE_EVENT, refresh)
    }, [refresh])

    return { ...base, loading: user ? loading : false, refresh }
}
