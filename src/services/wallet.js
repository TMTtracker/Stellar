import { supabase } from './supabaseClient'

export const WALLET_EVENT = 'stellar:wallet-changed'

/** Notify all useWallet hooks to refetch (called after any award/spend). */
export function notifyWalletChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(WALLET_EVENT))
    }
}

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

// ---------- Profiles ----------

/** Own profile, auto-created on first read. Returns null when signed out. */
export async function getMyProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    if (error) {
        if (isMissingTable(error)) return null // 002 migration not run yet
        throw error
    }
    if (data) return data

    const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select()
        .single()
    if (createError) {
        if (isMissingTable(createError)) return null
        throw createError
    }
    return created
}

/** Top profiles by lifetime XP (leaderboard). */
export async function getTopProfiles(limit = 10) {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, xp_total, coins')
        .order('xp_total', { ascending: false })
        .limit(limit)
    if (error) throw error
    return data ?? []
}

// ---------- Reward history ----------

export async function getMyRecentRewards(limit = 10) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('xp_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    return data ?? []
}

// ---------- Earn / spend (atomic RPCs, amounts set server-side) ----------

/**
 * Award lesson XP/coins once per (user, lesson). Idempotent — re-completing
 * returns { awarded: false } with current totals.
 */
export async function awardLessonComplete(lessonId) {
    const { data, error } = await supabase.rpc('award_lesson_complete', { p_lesson_id: lessonId })
    if (error) throw error
    notifyWalletChanged()
    return data
}

/**
 * Award quiz XP/coins once per (user, quiz) — first pass only.
 */
export async function awardQuizPass(quizId, attemptId = null) {
    const { data, error } = await supabase.rpc('award_quiz_pass', { p_quiz_id: quizId, p_attempt_id: attemptId })
    if (error) throw error
    notifyWalletChanged()
    return data
}

/**
 * Spend coins (shop, buildings). Returns { ok, coins, error? } —
 * ok:false with error:'insufficient_funds' instead of throwing.
 */
export async function spendCoins(amount, note = '') {
    const { data, error } = await supabase.rpc('spend_coins', { p_amount: amount, p_note: note })
    if (error) throw error
    if (data?.ok) notifyWalletChanged()
    return data
}
