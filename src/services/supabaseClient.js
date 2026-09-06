import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// New Supabase publishable key (sb_publishable_...). Falls back to legacy anon key.
const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabasePublishableKey) {
    console.warn(
        '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
        'Copy .env.example to .env and fill in your Supabase project values.'
    )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
