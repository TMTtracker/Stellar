import { supabase } from './supabaseClient'

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

const POST_COLUMNS = 'id, user_id, post_title, post_body, post_tag, post_likes, post_comments, post_time, profiles(display_name, xp_total)'

// ---------- Posts ----------

export async function listPosts(limit = 50) {
    const { data, error } = await supabase
        .from('user_posts')
        .select(POST_COLUMNS)
        .order('post_time', { ascending: false })
        .limit(limit)
    if (error) {
        if (isMissingTable(error)) return [] // 003 migration not run yet
        throw error
    }
    return data ?? []
}

export async function createPost({ title, body, tag }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to post')

    const { data, error } = await supabase
        .from('user_posts')
        .insert({
            user_id: user.id,
            post_title: title,
            post_body: body,
            post_tag: tag
        })
        .select(POST_COLUMNS)
        .single()
    if (error) throw error
    return data
}
