import { supabase } from './supabaseClient'

export const NOTIFICATIONS_EVENT = 'stellar:notifications-changed'

function notifyChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT))
    }
}

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

export async function listMyNotifications(limit = 20) {
    const { data, error } = await supabase
        .from('notifications')
        .select('id, kind, title, body, link, read, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    return data ?? []
}

export async function getUnreadNotificationCount() {
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)
    if (error) {
        if (isMissingTable(error)) return 0
        throw error
    }
    return count ?? 0
}

export async function markNotificationRead(id) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) throw error
    notifyChanged()
}

export async function markAllNotificationsRead() {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
    if (error) throw error
    notifyChanged()
}
