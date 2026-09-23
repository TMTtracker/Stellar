import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'stellar:dark-mode'

function readInitial() {
    if (typeof window === 'undefined') return false
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
        return false
    }
}

/**
 * Toggles the `dark` class on <html>, which activates the dark CSS
 * variables already defined in src/styles/global.css (`.dark { ... }`,
 * set up via `@custom-variant dark (&:is(.dark *))`). Persists the choice
 * in localStorage so it survives a reload.
 *
 * Note: most existing pages (Dashboard, ProtectedLayout, etc.) use
 * hardcoded hex colors rather than the semantic bg-background/
 * text-foreground tokens those variables drive, so toggling this
 * currently re-themes shadcn/ui primitives and anything using those
 * tokens, not the whole app's visible chrome yet - full re-theming
 * would be a separate pass.
 */
export function useDarkMode() {
    const [dark, setDark] = useState(readInitial)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
        try {
            window.localStorage.setItem(STORAGE_KEY, String(dark))
        } catch {
            // localStorage unavailable (private browsing, etc.) - the toggle still works for this session
        }
    }, [dark])

    const toggle = useCallback(() => setDark(d => !d), [])

    return { dark, toggle }
}
