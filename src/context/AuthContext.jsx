/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    // { userId, role } so a role fetched for a previous user never leaks
    const [roleState, setRoleState] = useState({ userId: null, role: null })

    useEffect(() => {
        let mounted = true

        if (!isSupabaseConfigured) {
            setLoading(false)
            return () => {
                mounted = false
            }
        }

        supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return
            if (error) console.error('[auth] getSession error:', error.message)
            setSession(data.session ?? null)
            setUser(data.session?.user ?? null)
            setLoading(false)
        })

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession)
            setUser(newSession?.user ?? null)
            setLoading(false)
        })

        return () => {
            mounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    // Account role lives in profiles.role (set once at signup, see
    // 018_instructor_role.sql). Falls back to signup metadata if the
    // migration hasn't been run yet.
    const userId = user?.id
    useEffect(() => {
        if (!userId || !supabase) return
        let cancelled = false
        supabase
            .from('profiles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) console.warn('[auth] role lookup failed:', error.message)
                setRoleState({ userId, role: data?.role ?? null })
            }, () => {
                if (!cancelled) setRoleState({ userId, role: null })
            })
        return () => {
            cancelled = true
        }
    }, [userId])
    const roleLoading = Boolean(userId && supabase && roleState.userId !== userId)
    const role = roleState.userId === userId ? roleState.role : null

    const signUp = useCallback(async ({ email, password, fullName, role: accountRole = 'student' }) => {
        if (!supabase) throw new Error('Supabase is not configured. Add the values from .env.example to .env.')

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { ...(fullName ? { full_name: fullName } : {}), role: accountRole }
            }
        })
        if (error) throw error
        return data
    }, [])

    const signIn = useCallback(async ({ email, password }) => {
        if (!supabase) throw new Error('Supabase is not configured. Add the values from .env.example to .env.')

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    }, [])

    const signOut = useCallback(async () => {
        if (!supabase) return

        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }, [])

    const updateProfile = useCallback(async ({ displayName, password }) => {
        if (!supabase) throw new Error('Supabase is not configured. Add the values from .env.example to .env.')

        const trimmedDisplayName = displayName.trim()
        if (!trimmedDisplayName) throw new Error('Display name cannot be empty.')

        const { error: profileError } = await supabase.rpc('set_display_name', {
            p_name: trimmedDisplayName
        })
        if (profileError) throw profileError

        const attributes = {
            data: {
                ...user?.user_metadata,
                full_name: trimmedDisplayName
            }
        }

        if (password) attributes.password = password

        const { data, error } = await supabase.auth.updateUser(attributes)
        if (error) throw error

        setSession(currentSession => currentSession ? { ...currentSession, user: data.user } : currentSession)
        setUser(data.user)
        return data.user
    }, [user])

    const resolvedRole = role ?? (user ? (user.user_metadata?.role === 'instructor' ? 'instructor' : 'student') : null)

    const value = useMemo(
        () => ({
            session,
            user,
            loading: loading || roleLoading,
            role: resolvedRole,
            isInstructor: resolvedRole === 'instructor',
            signUp,
            signIn,
            signOut,
            updateProfile,
            supabase
        }),
        [session, user, loading, roleLoading, resolvedRole, signUp, signIn, signOut, updateProfile]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
