import { notifyInventoryChanged, notifyWalletChanged } from './events'
import { addMaterials } from './inventory'
import { supabase } from './supabaseClient'

export { notifyWalletChanged, WALLET_EVENT } from './events'

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
        if (isMissingTable(error)) return null
        throw error
    }
    if (data) return data

    const display_name =
        user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || 'Stellar Cadet'
    const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, display_name })
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

// ---------- Earn / spend (direct table writes) ----------

/** Has this user already earned a once-ever ledger reward? */
async function hasLedgerReward(userId, filters) {
    let query = supabase
        .from('xp_ledger')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
    for (const [col, value] of Object.entries(filters)) {
        query = query.eq(col, value)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return !!data
}

/**
 * Award lesson XP/coins/materials once per (user, lesson). Idempotent —
 * re-completing returns { awarded: false } with current totals.
 */
export async function awardLessonComplete(lessonId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('xp_reward, coins_reward, material_name, material_qty')
        .eq('id', lessonId)
        .single()
    if (lessonError) throw lessonError

    const profile = await getMyProfile()
    if (!profile) throw new Error('Profile not available')

    if (await hasLedgerReward(user.id, { kind: 'lesson_complete', ref_lesson_id: lessonId })) {
        const current = await getMyProfile()
        return {
            awarded: false,
            xp: lesson.xp_reward,
            coins: lesson.coins_reward,
            xp_total: current?.xp_total ?? 0,
            coins_total: current?.coins ?? 0,
            material_name: lesson.material_name,
            material_qty: lesson.material_qty
        }
    }

    const { error: ledgerError } = await supabase.from('xp_ledger').insert({
        user_id: user.id,
        kind: 'lesson_complete',
        ref_lesson_id: lessonId,
        xp: lesson.xp_reward,
        coins: lesson.coins_reward
    })
    if (ledgerError) throw ledgerError

    const xp_total = (profile.xp_total ?? 0) + (lesson.xp_reward ?? 0)
    const coins_total = (profile.coins ?? 0) + (lesson.coins_reward ?? 0)
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ xp_total, coins: coins_total, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (profileError) throw profileError

    let material_column = null
    if (lesson.material_name && (lesson.material_qty ?? 0) > 0) {
        try {
            const res = await addMaterials(lesson.material_name, lesson.material_qty)
            material_column = res.item
        } catch (e) {
            console.warn('[economy] material grant skipped:', e.message)
        }
    }

    notifyWalletChanged()
    notifyInventoryChanged()
    return {
        awarded: true,
        xp: lesson.xp_reward,
        coins: lesson.coins_reward,
        xp_total,
        coins_total,
        material_name: lesson.material_name,
        material_qty: lesson.material_qty,
        material_column
    }
}

/**
 * Award quiz XP/coins once per (user, quiz) — first pass only.
 */
export async function awardQuizPass(quizId, attemptId = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('lesson_id, xp_reward, coins_reward')
        .eq('id', quizId)
        .single()
    if (quizError) throw quizError

    const profile = await getMyProfile()
    if (!profile) throw new Error('Profile not available')

    if (await hasLedgerReward(user.id, { kind: 'quiz_pass', ref_quiz_id: quizId })) {
        const current = await getMyProfile()
        return {
            awarded: false,
            xp: quiz.xp_reward,
            coins: quiz.coins_reward,
            xp_total: current?.xp_total ?? 0,
            coins_total: current?.coins ?? 0
        }
    }

    const { error: ledgerError } = await supabase.from('xp_ledger').insert({
        user_id: user.id,
        kind: 'quiz_pass',
        ref_quiz_id: quizId,
        ref_attempt_id: attemptId,
        ref_lesson_id: quiz.lesson_id,
        xp: quiz.xp_reward,
        coins: quiz.coins_reward
    })
    if (ledgerError) throw ledgerError

    const xp_total = (profile.xp_total ?? 0) + (quiz.xp_reward ?? 0)
    const coins_total = (profile.coins ?? 0) + (quiz.coins_reward ?? 0)
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ xp_total, coins: coins_total, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (profileError) throw profileError

    notifyWalletChanged()
    return {
        awarded: true,
        xp: quiz.xp_reward,
        coins: quiz.coins_reward,
        xp_total,
        coins_total
    }
}

/**
 * Spend coins (shop, buildings). Returns { ok, coins, error? } —
 * ok:false with error:'insufficient_funds' instead of throwing.
 */
export async function spendCoins(amount, note = '') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')
    if (!amount || amount <= 0) throw new Error('Invalid amount')

    const profile = await getMyProfile()
    if (!profile) throw new Error('Profile not available')
    if ((profile.coins ?? 0) < amount) {
        return { ok: false, error: 'insufficient_funds', coins: profile.coins ?? 0 }
    }

    const coins = profile.coins - amount
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ coins, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (profileError) throw profileError

    const { error: ledgerError } = await supabase.from('xp_ledger').insert({
        user_id: user.id,
        kind: 'spend',
        xp: 0,
        coins: -amount,
        note: note ?? ''
    })
    if (ledgerError) throw ledgerError

    notifyWalletChanged()
    return { ok: true, coins }
}
