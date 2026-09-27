import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/services/supabaseClient'
import {
    listMyNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    NOTIFICATIONS_EVENT
} from '@/services/notifications'

/**
 * Reactive notifications: { items, unreadCount, loading, markRead,
 * markAllRead, refresh }. Refetches on sign-in/out, on NOTIFICATIONS_EVENT
 * (after marking read), and live whenever a new notification row is
 * inserted for this user (comment on your post / lesson reward earned).
 */
export function useNotifications() {
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!user) {
            setItems([])
            setUnreadCount(0)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const [rows, count] = await Promise.all([listMyNotifications(), getUnreadNotificationCount()])
            setItems(rows)
            setUnreadCount(count)
        } catch (e) {
            console.error('[notifications] refresh failed:', e.message)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        refresh()
    }, [refresh])

    useEffect(() => {
        window.addEventListener(NOTIFICATIONS_EVENT, refresh)
        return () => window.removeEventListener(NOTIFICATIONS_EVENT, refresh)
    }, [refresh])

    useEffect(() => {
        if (!user) return
        let channel = null
        try {
            channel = supabase
                .channel(`notifications-${user.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
                    refresh()
                })
                .subscribe()
        } catch (_e) {}
        return () => { if (channel) supabase.removeChannel(channel) }
    }, [user, refresh])

    const markRead = useCallback(async (id) => {
        // Optimistic - the bell shouldn't lag behind a click.
        setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(c => Math.max(0, c - 1))
        try {
            await markNotificationRead(id)
        } catch (e) {
            console.error('[notifications] mark read failed:', e.message)
            refresh()
        }
    }, [refresh])

    const markAllRead = useCallback(async () => {
        setItems(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
        try {
            await markAllNotificationsRead()
        } catch (e) {
            console.error('[notifications] mark all read failed:', e.message)
            refresh()
        }
    }, [refresh])

    return { items, unreadCount, loading: user ? loading : false, markRead, markAllRead, refresh }
}
