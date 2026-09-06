import { supabase } from './supabaseClient'
import { awardLessonComplete } from './wallet'

// ---------- Courses ----------

export async function listCourses({ search = '' } = {}) {
    let query = supabase
        .from('courses')
        .select('id, title, subject, description, color, icon, estimated_hours, is_published, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: true })

    if (search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,subject.ilike.%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

export async function getCourse(courseId) {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
    if (error) throw error
    return data
}

export async function getCourseWithLessons(courseId) {
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
    if (courseError) throw courseError

    const lessons = await listLessons(courseId)
    return { course, lessons }
}

export async function createCourse({ title, subject, description, color, icon, estimated_hours }) {
    const { data, error } = await supabase
        .from('courses')
        .insert({
            title,
            subject,
            description,
            color: color ?? '#A9D8AE',
            icon: icon ?? 'BookOpen',
            estimated_hours: estimated_hours ?? 0
        })
        .select()
        .single()
    if (error) throw error
    return data
}

// ---------- Lessons ----------

export async function listLessons(courseId) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('position', { ascending: true })
    if (error) throw error
    return data ?? []
}

export async function createLesson(courseId, { title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty }) {
    const { data, error } = await supabase
        .from('lessons')
        .insert({
            course_id: courseId,
            title,
            summary: summary ?? '',
            duration_min: duration_min ?? 10,
            difficulty: difficulty ?? 'Easy',
            position,
            xp_reward: xp_reward ?? 40,
            coins_reward: coins_reward ?? 15,
            material_name: material_name ?? 'Bricks',
            material_qty: material_qty ?? 1
        })
        .select()
        .single()
    if (error) throw error
    return data
}

// ---------- Enrollments ----------

export async function getMyEnrollments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses(id, title, subject)')
        .eq('user_id', user.id)
    if (error) throw error
    return data ?? []
}

export async function getEnrollment(courseId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle()
    if (error) throw error
    return data
}

export async function enrollInCourse(courseId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to enroll')

    const { data, error } = await supabase
        .from('enrollments')
        .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })
        .select()
        .single()
    if (error) throw error
    return data
}

export async function unenrollFromCourse(courseId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId)
    if (error) throw error
}

// ---------- Lesson progress ----------

export async function getCourseProgress(courseId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status, completed_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
    if (error) throw error
    return data ?? []
}

export async function completeLesson({ lessonId, courseId }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
            { user_id: user.id, lesson_id: lessonId, course_id: courseId, status: 'completed' },
            { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single()
    if (error) throw error

    // Auto-enroll on first completion (enrollment is implicit once you start)
    await supabase
        .from('enrollments')
        .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })

    // Earn lesson XP/coins once-ever (best-effort: progress is saved even if
    // the economy migration hasn't been run yet). Un-completing later does
    // NOT revoke earned rewards — the ledger is append-only history.
    let reward = null
    try {
        reward = await awardLessonComplete(lessonId)
    } catch (e) {
        console.warn('[economy] lesson award skipped:', e.message)
    }

    return { progress: data, reward }
}

export async function uncompleteLesson(lessonId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')

    const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
    if (error) throw error
}

// ---------- Aggregated: courses + per-user progress ----------

export async function listCoursesWithProgress({ search = '' } = {}) {
    const courses = await listCourses({ search })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || courses.length === 0) {
        return courses.map(c => ({ ...c, completed: 0, total: 0, enrolled: false }))
    }

    const courseIds = courses.map(c => c.id)

    // lesson counts per course
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('is_published', true)
    if (lessonsError) throw lessonsError

    const totals = {}
    for (const l of lessons ?? []) totals[l.course_id] = (totals[l.course_id] ?? 0) + 1

    // completed counts for this user
    const { data: progress, error: progressError } = await supabase
        .from('lesson_progress')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds)
    if (progressError) throw progressError

    const completed = {}
    for (const p of progress ?? []) completed[p.course_id] = (completed[p.course_id] ?? 0) + 1

    // enrollment flags
    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .in('course_id', courseIds)
    if (enrollError) throw enrollError
    const enrolledSet = new Set((enrollments ?? []).map(e => e.course_id))

    return courses.map(c => ({
        ...c,
        total: totals[c.id] ?? 0,
        completed: completed[c.id] ?? 0,
        enrolled: enrolledSet.has(c.id)
    }))
}
