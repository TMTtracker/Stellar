import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMyProfile, WALLET_EVENT } from '@/services/wallet'
import { levelProgress } from '@/lib/economy'

/**
 * Reactive wallet: { xp, coins, level, current, needed, pct, loading, refresh }.
 * Refetches on sign-in/out and whenever an award/spend fires WALLET_EVENT.
 * Degrades to zeros (not errors) when the 002 migration hasn't been run yet.
 */
export function useWallet() {
    const { user } = useAuth()
    const [xp, setXp] = useState(0)
    const [coins, setCoins] = useState(0)
    const [xpBoostCharges, setXpBoostCharges] = useState(0)
    const [xpBoostUntil, setXpBoostUntil] = useState(null)
    const [loading, setLoading] = useState(true)

    const applyProfile = useCallback((profile) => {
        setXp(profile?.xp_total ?? 0)
        setCoins(profile?.coins ?? 0)
        setXpBoostCharges(profile?.xp_boost_charges ?? 0)
        setXpBoostUntil(profile?.xp_boost_until ?? null)
    }, [])

    const refresh = useCallback(async () => {
        if (!user) {
            applyProfile(null)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const profile = await getMyProfile()
            applyProfile(profile)
        } catch (e) {
            console.error('[wallet] refresh failed:', e.message)
        } finally {
            setLoading(false)
        }
    }, [user, applyProfile])

    // Identity-change load. All state updates live in the promise
    // callbacks (external async system), never synchronously in the effect.
    // When signed out we simply report zeros (see return below).
    useEffect(() => {
        if (!user) return
        let cancelled = false
        getMyProfile()
            .then(profile => {
                if (cancelled) return
                applyProfile(profile)
            })
            .catch(e => console.error('[wallet] refresh failed:', e.message))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user, applyProfile])

    useEffect(() => {
        window.addEventListener(WALLET_EVENT, refresh)
        return () => window.removeEventListener(WALLET_EVENT, refresh)
    }, [refresh])

    const shownXp = user ? xp : 0
    const shownCoins = user ? coins : 0
    const progress = levelProgress(shownXp)
    const xpBoostActive = user && !!xpBoostUntil && new Date(xpBoostUntil) > new Date()

    return {
        xp: shownXp,
        coins: shownCoins,
        ...progress,
        xpBoostCharges: user ? xpBoostCharges : 0,
        xpBoostUntil: user ? xpBoostUntil : null,
        xpBoostActive,
        loading: user ? loading : false,
        refresh
    }
}
