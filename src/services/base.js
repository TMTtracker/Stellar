import { supabase } from './supabaseClient'

export const BASE_EVENT = 'stellar:base-changed'

function notifyBaseChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BASE_EVENT))
    }
}

const DEFAULT_BASE = { base_level: 1, pos_x: 0, pos_y: 0, rotation: 0 }

/** The player's home base (level 1 camp until upgraded). Degrades to the
 * level-1 default when no row exists yet (brand new player, or the 016
 * migration hasn't been run). */
export async function getMyBase() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_BASE

    const { data, error } = await supabase
        .from('user_base')
        .select('base_level, pos_x, pos_y, rotation')
        .eq('user_id', user.id)
        .maybeSingle()
    if (error) {
        if (/could not find the table|schema cache/i.test(error.message ?? '')) return DEFAULT_BASE
        throw error
    }
    return data ?? DEFAULT_BASE
}

/** Catalog of upgrade requirements, keyed by level (2-6, only configured levels included). */
export async function listBaseLevels() {
    const { data, error } = await supabase
        .from('base_levels')
        .select('*')
        .order('level', { ascending: true })
    if (error) {
        if (/could not find the table|schema cache/i.test(error.message ?? '')) return []
        throw error
    }
    return data ?? []
}

/** Spends the next level's materials and bumps base_level by one. */
export async function upgradeBase() {
    const { data, error } = await supabase.rpc('upgrade_base')
    if (error) throw error
    if (data?.ok) notifyBaseChanged()
    return data
}

/** Snaps the base to a new grid cell (same move tool as any other building). */
export async function moveBase({ pos_x, pos_y }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')
    const { error } = await supabase.from('user_base').update({ pos_x, pos_y }).eq('user_id', user.id)
    if (error) throw error
    notifyBaseChanged()
}

/** Sets the base's facing (degrees). */
export async function rotateBase(rotation) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')
    const { error } = await supabase.from('user_base').update({ rotation }).eq('user_id', user.id)
    if (error) throw error
    notifyBaseChanged()
}
