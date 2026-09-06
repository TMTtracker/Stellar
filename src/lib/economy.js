// STELLAR economy math — single source of truth for levels.
// Level is DERIVED from lifetime XP (never stored), so the curve can be
// tuned without a data migration. Keep in sync with the comment in
// supabase/migrations/002_economy.sql.
//
// Curve: reaching level L requires 100 * L * (L - 1) / 2 lifetime XP.
//   L1: 0 · L2: 100 · L3: 300 · L4: 600 · L5: 1000 · L12: 6600 ...

export const XP_BASE = 100

/** Lifetime XP required to REACH a level (level >= 1). */
export function xpForLevel(level) {
    if (level <= 1) return 0
    return XP_BASE * level * ((level - 1) / 2)
}

/** Level for a lifetime XP total (level >= 1). */
export function levelForXp(xp) {
    const total = Math.max(0, xp ?? 0)
    // Solve 100*L*(L-1)/2 <= total  →  L = (1 + sqrt(1 + 8*total/100)) / 2
    return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * total) / XP_BASE)) / 2))
}

/** Progress within the current level: { level, current, needed, pct }. */
export function levelProgress(xp) {
    const total = Math.max(0, xp ?? 0)
    const level = levelForXp(total)
    const floor = xpForLevel(level)
    const ceiling = xpForLevel(level + 1)
    const current = total - floor
    const needed = ceiling - floor
    return { level, current, needed, pct: needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100 }
}

export function formatCoins(n) {
    return (n ?? 0).toLocaleString()
}
