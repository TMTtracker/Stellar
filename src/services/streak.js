import { supabase } from './supabaseClient'
import { notifyWalletChanged } from './events'
import { RESOURCES_EVENT } from './resources'

function notifyResourcesChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(RESOURCES_EVENT))
    }
}

/**
 * Call once per app session for a signed-in user. Server-side (see
 * process_login_streak in 014_login_streak.sql) decides whether today is a
 * new day, bumps the streak, and grants the XP/rare-gem bonus - the client
 * only reports the result, it never computes or sends the streak itself.
 */
export async function processLoginStreak() {
    const { data, error } = await supabase.rpc('process_login_streak')
    if (error) throw error
    if (data?.ok && !data.alreadyCounted) {
        if (data.xpAwarded > 0) notifyWalletChanged()
        if (data.gemsAwarded > 0) notifyResourcesChanged()
    }
    return data
}
