import { supabase } from './supabaseClient'
import { notifyInventoryChanged, notifyWalletChanged } from './events'

export { INVENTORY_EVENT, notifyInventoryChanged } from './events'

// Canonical material table is player_resources (see 011_merge_inventories:
// the old standalone `inventories` table was folded into it so lesson
// rewards, shop grants, and the build panel all share one stockpile).
// UI code keeps the `rare_gems` key; only the player column is `rare_gem`.
const TABLE = 'player_resources'

export const INVENTORY_COLUMNS = [
    'bricks',
    'timber',
    'rare_gems',
    'stone',
    'iron',
    'glass',
    'crystal_shard',
    'fabric'
]

export const ZERO_INVENTORY = Object.freeze({
    bricks: 0,
    timber: 0,
    rare_gems: 0,
    stone: 0,
    iron: 0,
    glass: 0,
    crystal_shard: 0,
    fabric: 0
})

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

/**
 * Map a material label (lessons.material_name or dialog label) to its
 * inventories column. Mirrors the old inventory_column_for() SQL helper:
 * 'Rare gem' <-> 'Rare gems', 'Timber' <-> 'Logs', etc.
 * Returns null for unknown materials.
 */
export function inventoryColumnFor(name) {
    const v = (name ?? '').trim().toLowerCase()
    if (v === 'bricks') return 'bricks'
    if (['timber', 'logs', 'log', 'wood'].includes(v)) return 'timber'
    if (['rare gem', 'rare gems', 'rare_gem', 'rare_gems', 'gem', 'gems'].includes(v)) return 'rare_gems'
    if (v === 'stone') return 'stone'
    if (v === 'iron') return 'iron'
    if (v === 'glass') return 'glass'
    if (['crystal shard', 'crystal shards', 'crystal_shard', 'crystal', 'shard'].includes(v)) return 'crystal_shard'
    if (v === 'fabric') return 'fabric'
    return null
}

/** UI key -> player_resources column (only rare_gem differs). */
const PLAYER_COLUMN = {
    bricks: 'bricks',
    timber: 'timber',
    rare_gems: 'rare_gem',
    stone: 'stone',
    iron: 'iron',
    glass: 'glass',
    crystal_shard: 'crystal_shard',
    fabric: 'fabric'
}

const PLAYER_SELECT = 'bricks, timber, rare_gem, stone, iron, glass, crystal_shard, fabric'

function toInventoryRow(row) {
    return {
        bricks: row?.bricks ?? 0,
        timber: row?.timber ?? 0,
        rare_gems: row?.rare_gem ?? 0,
        stone: row?.stone ?? 0,
        iron: row?.iron ?? 0,
        glass: row?.glass ?? 0,
        crystal_shard: row?.crystal_shard ?? 0,
        fabric: row?.fabric ?? 0
    }
}

/** Ensure the user has a resources row (zeroed) and return it. */
export async function ensureInventoryRow(userId) {
    const { data, error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select(PLAYER_SELECT)
        .single()
    if (error) throw error
    return toInventoryRow(data)
}

/** Own inventory row, auto-created (zeroed) on first read. Zeros when signed out. */
export async function getMyInventory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...ZERO_INVENTORY }

    try {
        return await ensureInventoryRow(user.id)
    } catch (error) {
        if (isMissingTable(error)) return { ...ZERO_INVENTORY }
        throw error
    }
}

/** Sum of all 8 material counts (badge / header total). */
export function inventoryTotal(inventory) {
    if (!inventory) return 0
    return INVENTORY_COLUMNS.reduce((sum, col) => sum + (inventory[col] ?? 0), 0)
}

/**
 * Grant materials (lesson rewards, dev tools). Returns { ok, item, qty } —
 * qty is the new count for the material column. `item` is the UI key.
 */
export async function addMaterials(item, qty) {
    const uiKey = inventoryColumnFor(item)
    if (!uiKey) throw new Error(`Unknown material: ${item}`)
    if (!qty || qty <= 0) throw new Error('Invalid quantity')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const row = await ensureInventoryRow(user.id)
    const next = row[uiKey] + qty
    const col = PLAYER_COLUMN[uiKey]

    const { error } = await supabase
        .from(TABLE)
        .update({ [col]: next, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (error) throw error

    notifyInventoryChanged()
    notifyWalletChanged()
    return { ok: true, item: uiKey, qty: next }
}

/**
 * Spend materials (building costs). Returns { ok, item, qty, error? } —
 * ok:false with error:'insufficient_materials' instead of throwing.
 */
export async function spendMaterials(item, qty) {
    const uiKey = inventoryColumnFor(item)
    if (!uiKey) throw new Error(`Unknown material: ${item}`)
    if (!qty || qty <= 0) throw new Error('Invalid quantity')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const row = await ensureInventoryRow(user.id)
    if (row[uiKey] < qty) {
        return { ok: false, error: 'insufficient_materials', item: uiKey, qty: row[uiKey] }
    }
    const col = PLAYER_COLUMN[uiKey]

    const { error } = await supabase
        .from(TABLE)
        .update({ [col]: row[uiKey] - qty, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (error) throw error

    notifyInventoryChanged()
    notifyWalletChanged()
    return { ok: true, item: uiKey, qty: row[uiKey] - qty }
}
