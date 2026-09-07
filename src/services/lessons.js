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
