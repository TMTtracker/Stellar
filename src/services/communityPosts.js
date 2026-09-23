import { supabase } from './supabaseClient'

function isMissingTable(error) {
    return !!error && /could not find the table|schema cache/i.test(error.message ?? '')
}

function isMissingColumn(error) {
    return !!error && /column|post_image/i.test(error.message ?? '')
}

const POST_COLUMNS = 'id, user_id, post_title, post_body, post_tag, post_likes, post_comments, post_time, profiles(display_name, xp_total)'
const POST_COLUMNS_WITH_IMAGE = 'id, user_id, post_title, post_body, post_tag, post_likes, post_comments, post_time, post_image_url, profiles(display_name, xp_total)'

// ---------- Image upload ----------

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

export async function uploadPostImage(file) {
    if (!file) return null
    // Validate size/type quickly
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB')
    // Try Supabase Storage first
    try {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const bucket = 'post-images'
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        })
        if (!uploadError) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(path)
            if (data?.publicUrl) return data.publicUrl
        }
        // If bucket missing, fall through to data URL
        if (uploadError && !/Bucket not found|not found/i.test(uploadError.message ?? '')) {
            // Non-bucket error: still fallback but surface warning
            console.warn('[community] storage upload failed, using data URL fallback:', uploadError.message)
        }
    } catch (e) {
        console.warn('[community] storage upload exception, using data URL fallback:', e.message)
    }
    // Fallback: inline data URL (works without storage/migration)
    return await fileToDataUrl(file)
}

// ---------- Likes ----------

export async function getMyLikedPostIds(postIds = []) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !postIds.length) return new Set()
    const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds)
    if (error) {
        if (isMissingTable(error)) return new Set()
        throw error
    }
    return new Set((data ?? []).map(r => r.post_id))
}

export async function getAllMyLikedPostIds() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()
    const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
    if (error) {
        if (isMissingTable(error)) return new Set()
        throw error
    }
    return new Set((data ?? []).map(r => r.post_id))
}

export async function toggleLike(postId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to react')
    // Check existing like
    const { data: existing, error: checkError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()
    if (checkError && !isMissingTable(checkError)) throw checkError
    if (isMissingTable(checkError)) {
        // Fallback: direct counter increment (no per-user tracking)
        const { data: post } = await supabase.from('user_posts').select('post_likes').eq('id', postId).single()
        const next = (post?.post_likes ?? 0) + 1
        const { error: upErr } = await supabase.from('user_posts').update({ post_likes: next }).eq('id', postId)
        if (upErr) throw upErr
        return { liked: true, delta: 1 }
    }
    if (existing) {
        const { error: delError } = await supabase.from('post_likes').delete().eq('id', existing.id)
        if (delError) throw delError
        return { liked: false, delta: -1 }
    } else {
        const { error: insError } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
        if (insError) throw insError
        return { liked: true, delta: 1 }
    }
}

// ---------- Comments ----------

export async function listComments(postId, limit = 50) {
    // Public comments: fetch for any post and enrich with profiles for display name
    const { data, error } = await supabase
        .from('post_comments')
        .select('id, body, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(limit)
    if (error) {
        if (isMissingTable(error)) return []
        throw error
    }
    const rows = data ?? []
    if (!rows.length) return []
    // Enrich with display_name from profiles (public)
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
    let profilesMap = {}
    if (userIds.length) {
        try {
            const { data: profs } = await supabase
                .from('profiles')
                .select('user_id, display_name')
                .in('user_id', userIds)
            if (profs) {
                for (const p of profs) profilesMap[p.user_id] = p.display_name
            }
        } catch (_e) {}
    }
    return rows.map(row => ({
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        user_id: row.user_id,
        display_name: profilesMap[row.user_id] || 'Stellar Cadet',
    }))
}

export async function createComment(postId, body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to comment')
    const text = (body ?? '').trim()
    if (!text) throw new Error('Comment cannot be empty')
    if (text.length > 1000) throw new Error('Comment too long (max 1000)')
    const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user.id, body: text })
        .select('id, body, created_at, user_id')
        .single()
    if (error) throw error
    // Fetch profile name for optimistic UI
    let display_name = 'Stellar Cadet'
    try {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
        if (prof?.display_name) display_name = prof.display_name
    } catch (_e) {}
    return { ...data, display_name }
}

// ---------- Posts ----------

export async function listPosts(limit = 50) {
    // Try with image column first, fallback if migration not run
    const { data, error } = await supabase
        .from('user_posts')
        .select(POST_COLUMNS_WITH_IMAGE)
        .order('post_time', { ascending: false })
        .limit(limit)
    if (error) {
        if (isMissingTable(error)) return [] // 003 migration not run yet
        if (isMissingColumn(error)) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('user_posts')
                .select(POST_COLUMNS)
                .order('post_time', { ascending: false })
                .limit(limit)
            if (fallbackError) {
                if (isMissingTable(fallbackError)) return []
                throw fallbackError
            }
            return fallbackData ?? []
        }
        throw error
    }
    return data ?? []
}

export async function createPost({ title, body, tag, imageUrl = null }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to post')

    const payload = {
        user_id: user.id,
        post_title: title,
        post_body: body,
        post_tag: tag,
    }
    if (imageUrl) payload.post_image_url = imageUrl

    // Try with image column
    let { data, error } = await supabase
        .from('user_posts')
        .insert(payload)
        .select(POST_COLUMNS_WITH_IMAGE)
        .single()

    if (error && isMissingColumn(error)) {
        // Column not yet migrated: retry without image (embed fallback into body if data URL)
        const fallbackPayload = { user_id: user.id, post_title: title, post_body: body, post_tag: tag }
        // If we have an image URL that's a data URL or http, we can append markdown hint but keep body clean for now
        // For display fallback, we store image as separate field in returned data
        const fallback = await supabase
            .from('user_posts')
            .insert(fallbackPayload)
            .select(POST_COLUMNS)
            .single()
        if (fallback.error) throw fallback.error
        // Attach imageUrl client-side for optimistic UI even though not persisted in column
        return { ...fallback.data, post_image_url: imageUrl }
    }

    if (error) throw error
    return data
}
