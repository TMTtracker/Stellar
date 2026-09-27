import { supabase } from './supabaseClient'
import { notifyWalletChanged } from './wallet'

export const RESOURCES_EVENT = 'stellar:resources-changed'

function notifyResourcesChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(RESOURCES_EVENT))
    }
}

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

// ---------- Player resources ----------

/** Own build-material inventory, auto-created on first read. Returns null when signed out. */
export async function getMyResources() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('player_resources')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
    if (error) {
        if (isMissingTable(error)) return null // 004 migration not run yet
        throw error
    }
    if (data) return data

    const { data: created, error: createError } = await supabase
        .from('player_resources')
        .insert({ user_id: user.id })
        .select()
        .single()
    if (createError) {
        if (isMissingTable(createError)) return null
        throw createError
    }
    return created
}

// ---------- Build menu ----------

export async function listBuildMenu() {
    const { data, error } = await supabase
        .from('build_menu')
        .select('*')
        .order('unlock_level', { ascending: true })
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    return data ?? []
}

/** Every placed instance on the caller's grid. Includes the building's display name via the build_menu relation. */
export async function listMyBuildings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('user_building_positions')
        .select('*, build_menu(name)')
        .eq('user_id', user.id)
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    return data ?? []
}

/** Building types the caller has unlocked (permanent - this is what "Your Builds" lists). */
export async function listMyUnlockedBuildings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('user_unlocked_buildings')
        .select('build_id, unlocked_at, build_menu(name)')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: true })
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    return data ?? []
}

// ---------- Build actions (RPCs; { ok, ... } shape, don't throw for "not enough") ----------

/** Permanently unlocks a building type (spends materials once). Place instances of it afterward via placeNewBuilding. */
export async function buildStructure(buildId) {
    const { data, error } = await supabase.rpc('build_structure', { p_build_id: buildId })
    if (error) throw error
    if (data?.ok) notifyResourcesChanged()
    return data
}

export async function buyMissingMaterials(buildId) {
    const { data, error } = await supabase.rpc('buy_missing_materials', { p_build_id: buildId })
    if (error) throw error
    if (data?.ok) {
        notifyResourcesChanged()
        notifyWalletChanged()
    }
    return data
}

// ---------- Placement ----------

/**
 * Places a new instance of an already-unlocked building type. This is an
 * RPC (not a plain insert) because it must verify server-side that you
 * actually unlocked build_id first - RLS on user_building_positions only
 * checks user_id = auth.uid(), it has no idea whether you ever paid for
 * that type, so a plain client insert could place anything.
 */
export async function placeNewBuilding(buildId, { pos_x = 0, pos_y = 0, rotation = 0 } = {}) {
    const { data, error } = await supabase.rpc('place_new_building', {
        p_build_id: buildId,
        p_pos_x: pos_x,
        p_pos_y: pos_y,
        p_rotation: rotation
    })
    if (error) throw error
    if (data?.ok) notifyResourcesChanged()
    return data
}

// Move/rotate/remove act on an instance you already own (proven by the
// row's own user_id), so plain table ops under existing RLS are enough -
// no ownership-of-type check needed here, unlike placing a new one above.

/** Snaps an already-placed building to a new grid cell. */
export async function moveBuilding(id, { pos_x, pos_y }) {
    const { data, error } = await supabase
        .from('user_building_positions')
        .update({ pos_x, pos_y })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    notifyResourcesChanged()
    return data
}

/** Sets an already-placed building's rotation (degrees). */
export async function rotateBuilding(id, rotation) {
    const { data, error } = await supabase
        .from('user_building_positions')
        .update({ rotation })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    notifyResourcesChanged()
    return data
}

/** Removes a placed instance from the grid. Ownership of the type (Your Builds) is unaffected - place another anytime. */
export async function removeBuilding(id) {
    const { error } = await supabase
        .from('user_building_positions')
        .delete()
        .eq('id', id)
    if (error) throw error
    notifyResourcesChanged()
}

// ---------- Shop ----------

/** Spends coins on a Shop item and grants its material (if any) atomically. */
export async function buyShopItem(itemId) {
    const { data, error } = await supabase.rpc('buy_shop_item', { p_item_id: itemId })
    if (error) throw error
    if (data?.ok) {
        notifyResourcesChanged()
        notifyWalletChanged()
    }
    return data
}
