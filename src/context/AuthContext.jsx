/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/services/supabaseClient'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

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

    const signUp = useCallback(async ({ email, password, fullName }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: fullName ? { full_name: fullName } : undefined
            }
        })
        if (error) throw error
        return data
    }, [])

    const signIn = useCallback(async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    }, [])

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }, [])

    const value = useMemo(
        () => ({ session, user, loading, signUp, signIn, signOut, supabase }),
        [session, user, loading, signUp, signIn, signOut]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
