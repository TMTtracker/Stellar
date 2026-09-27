import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { processLoginStreak } from '@/services/streak'

/**
 * Calls process_login_streak() once per signed-in session (the RPC itself
 * is idempotent for the day - a re-render or remount won't double-count),
 * then exposes both today's confirmed streak and a forecast for tomorrow's
 * login, so the UI can show "come back tomorrow for +X" / "N days to your
 * next rare gem bonus" without waiting for the user to actually return.
 */
export function useStreak() {
    const { user } = useAuth()
    const [streak, setStreak] = useState(0)
    const [today, setToday] = useState(null) // { xpAwarded, gemsAwarded, isMilestone } | null
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            setStreak(0)
            setToday(null)
            setLoading(false)
            return
        }
        let cancelled = false
        processLoginStreak()
            .then((res) => {
                if (cancelled || !res?.ok) return
                setStreak(res.streak)
                if (!res.alreadyCounted) {
                    setToday({ xpAwarded: res.xpAwarded, gemsAwarded: res.gemsAwarded, isMilestone: res.isMilestone })
                }
            })
            .catch((e) => console.error('[streak] process failed:', e.message))
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [user?.id])

    const nextStreak = streak + 1
    const nextXp = nextStreak * 10
    const nextIsMilestone = nextStreak % 10 === 0
    const daysToMilestone = nextIsMilestone ? 0 : 10 - (nextStreak % 10)

    return { streak, loading, today, nextStreak, nextXp, nextIsMilestone, daysToMilestone }
}
