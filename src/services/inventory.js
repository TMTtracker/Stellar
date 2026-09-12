import { supabase } from './supabaseClient'
import { notifyInventoryChanged, notifyWalletChanged } from './events'

export { INVENTORY_EVENT, notifyInventoryChanged } from './events'

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

function toInventoryRow(row) {
    return {
        bricks: row?.bricks ?? 0,
        timber: row?.timber ?? 0,
        rare_gems: row?.rare_gems ?? 0,
        stone: row?.stone ?? 0,
        iron: row?.iron ?? 0,
        glass: row?.glass ?? 0,
        crystal_shard: row?.crystal_shard ?? 0,
        fabric: row?.fabric ?? 0
    }
}

/** Ensure the user has an inventory row (zeroed) and return it. */
export async function ensureInventoryRow(userId) {
    const { data, error } = await supabase
        .from('inventories')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('bricks, timber, rare_gems, stone, iron, glass, crystal_shard, fabric')
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
 * qty is the new count for the material column.
 */
export async function addMaterials(item, qty) {
    const col = inventoryColumnFor(item)
    if (!col) throw new Error(`Unknown material: ${item}`)
    if (!qty || qty <= 0) throw new Error('Invalid quantity')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const row = await ensureInventoryRow(user.id)
    const next = row[col] + qty

    const { error } = await supabase
        .from('inventories')
        .update({ [col]: next, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (error) throw error

    notifyInventoryChanged()
    notifyWalletChanged()
    return { ok: true, item: col, qty: next }
}

/**
 * Spend materials (building costs). Returns { ok, item, qty, error? } —
 * ok:false with error:'insufficient_materials' instead of throwing.
 */
export async function spendMaterials(item, qty) {
    const col = inventoryColumnFor(item)
    if (!col) throw new Error(`Unknown material: ${item}`)
    if (!qty || qty <= 0) throw new Error('Invalid quantity')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const row = await ensureInventoryRow(user.id)
    if (row[col] < qty) {
        return { ok: false, error: 'insufficient_materials', item: col, qty: row[col] }
    }

    const { error } = await supabase
        .from('inventories')
        .update({ [col]: row[col] - qty, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    if (error) throw error

    notifyInventoryChanged()
    notifyWalletChanged()
    return { ok: true, item: col, qty: row[col] - qty }
}
