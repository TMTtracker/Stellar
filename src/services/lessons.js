import { supabase } from './supabaseClient'

// ---------- Single lesson ----------

export async function getLesson(lessonId) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()
    if (error) throw error
    return data
}

/**
 * Full payload for the lesson show page:
 * lesson + parent course + sibling lessons (ordered, for prev/next +
 * sequential-lock computation) + supplementary resources.
 */
export async function getLessonDetail(lessonId) {
    const lesson = await getLesson(lessonId)

    const [{ data: course, error: courseError }, { data: siblings, error: siblingsError }, { data: resources, error: resourcesError }] =
        await Promise.all([
            supabase.from('courses').select('*').eq('id', lesson.course_id).single(),
            supabase
                .from('lessons')
                .select('id, title, position, duration_min, difficulty')
                .eq('course_id', lesson.course_id)
                .eq('is_published', true)
                .order('position', { ascending: true }),
            supabase
                .from('lesson_resources')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('position', { ascending: true })
        ])

    if (courseError) throw courseError
    if (siblingsError) throw siblingsError
    if (resourcesError) throw resourcesError

    const idx = (siblings ?? []).findIndex(s => s.id === lessonId)
    return {
        lesson,
        course,
        siblings: siblings ?? [],
        prev: idx > 0 ? siblings[idx - 1] : null,
        next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
        resources: resources ?? []
    }
}

export async function listLessonResources(lessonId) {
    const { data, error } = await supabase
        .from('lesson_resources')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('position', { ascending: true })
    if (error) throw error
    return data ?? []
}

/**
 * Daily lessons for the dashboard: real published lessons, not placeholders.
 *
 * Strategy:
 * - If the user is enrolled in courses, return the next incomplete lesson
 *   from each enrolled course (in course creation order), then fill any
 *   remaining slots with the earliest incomplete lessons overall.
 * - Completed lessons (from lesson_progress) are skipped so the panel
 *   always points at something actionable.
 * - If signed out / no enrollments / no progress table yet, falls back to
 *   the first published lessons so the panel still shows real content.
 */
export async function listDailyLessons({ limit = 3 } = {}) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            id, course_id, title, summary, duration_min, difficulty,
            position, xp_reward, coins_reward, material_name, material_qty,
            courses ( id, title )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .order('position', { ascending: true })
        .limit(60)
    if (error) throw error

    const all = lessons ?? []
    if (all.length === 0) return []
    if (!user) return all.slice(0, limit)

    let enrolledIds
    let completedIds = new Set()
    try {
        const [{ data: enrollments }, { data: progress }] = await Promise.all([
            supabase.from('enrollments').select('course_id').eq('user_id', user.id),
            supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id)
        ])
        enrolledIds = new Set((enrollments ?? []).map(e => e.course_id))
        completedIds = new Set((progress ?? []).map(p => p.lesson_id))
    } catch {
        // progress/enrollment tables missing or RLS-blocked: fall back to plain list
        return all.slice(0, limit)
    }

    const incomplete = all.filter(l => !completedIds.has(l.id))
    const pool = incomplete.length > 0 ? incomplete : all

    if (!enrolledIds || enrolledIds.size === 0) return pool.slice(0, limit)

    // One "next up" lesson per enrolled course, preserving course order,
    // then fill leftovers with earliest remaining lessons.
    const seenCourses = new Set()
    const nextUp = []
    for (const lesson of pool) {
        if (enrolledIds.has(lesson.course_id) && !seenCourses.has(lesson.course_id)) {
            seenCourses.add(lesson.course_id)
            nextUp.push(lesson)
        }
        if (nextUp.length >= limit) break
    }
    if (nextUp.length < limit) {
        const picked = new Set(nextUp.map(l => l.id))
        for (const lesson of pool) {
            if (picked.has(lesson.id)) continue
            nextUp.push(lesson)
            if (nextUp.length >= limit) break
        }
    }
    return nextUp
}
