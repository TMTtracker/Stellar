import { supabase } from './supabaseClient'
import { lessonContentToHtml } from '@/lib/lessonContent'
import { toEditorQuiz, toQuizPayload } from '@/lib/quiz'

async function currentUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in')
    return user.id
}

// ---------- Dashboard ----------

/** Courses owned by the signed-in instructor (drafts included), with lesson + student counts. */
export async function listMyCourses() {
    const userId = await currentUserId()

    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, subject, description, color, icon, estimated_hours, is_published, created_at, updated_at')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })
    if (error) throw error
    if (!courses?.length) return []

    const ids = courses.map(c => c.id)
    const [{ data: lessons, error: lessonsError }, { data: enrollments, error: enrollError }] = await Promise.all([
        supabase.from('lessons').select('course_id, duration_min').in('course_id', ids),
        supabase.from('enrollments').select('course_id').in('course_id', ids)
    ])
    if (lessonsError) throw lessonsError
    // Enrollment counts need the instructor read policy from 018 - degrade to 0.
    if (enrollError) console.warn('[instructor] enrollment counts unavailable:', enrollError.message)

    const lessonCount = {}
    const minutes = {}
    for (const l of lessons ?? []) {
        lessonCount[l.course_id] = (lessonCount[l.course_id] ?? 0) + 1
        minutes[l.course_id] = (minutes[l.course_id] ?? 0) + (l.duration_min ?? 0)
    }
    const students = {}
    for (const e of enrollments ?? []) students[e.course_id] = (students[e.course_id] ?? 0) + 1

    return courses.map(c => ({
        ...c,
        lessonCount: lessonCount[c.id] ?? 0,
        minutes: minutes[c.id] ?? 0,
        students: students[c.id] ?? 0
    }))
}

// ---------- Editor ----------

/** Course + all its lessons (drafts included), with lesson bodies as editor HTML. */
export async function getCourseForEditing(courseId) {
    const userId = await currentUserId()

    const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
    if (error) throw error
    if (course.created_by !== userId) throw new Error('You can only edit courses you created.')

    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
            id, title, summary, content, content_format, duration_min, difficulty, position,
            quizzes ( title, passing_score, quiz_questions ( question, explanation, position, quiz_options ( option_text, is_correct, position ) ) )
        `)
        .eq('course_id', courseId)
        .order('position', { ascending: true })
    if (lessonsError) throw lessonsError

    const byPosition = (a, b) => a.position - b.position
    return {
        course,
        lessons: (lessons ?? []).map(l => {
            const quiz = l.quizzes?.[0]
            return {
                id: l.id,
                title: l.title,
                summary: l.summary ?? '',
                duration_min: l.duration_min,
                difficulty: l.difficulty,
                content: lessonContentToHtml(l),
                quiz: quiz
                    ? toEditorQuiz({
                        title: quiz.title,
                        passing_score: quiz.passing_score,
                        questions: [...(quiz.quiz_questions ?? [])].sort(byPosition).map(q => ({
                            question: q.question,
                            explanation: q.explanation,
                            options: [...(q.quiz_options ?? [])].sort(byPosition)
                        }))
                    })
                    : null,
                quizDirty: false
            }
        })
    }
}

/**
 * Course + every lesson (drafts included) as raw rows, for the instructor's
 * student-view preview. Quizzes are fetched per lesson by the page.
 */
export async function getCoursePreview(courseId) {
    const userId = await currentUserId()

    const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()
    if (error) throw error
    if (course.created_by !== userId) throw new Error('You can only preview courses you created.')

    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true })
    if (lessonsError) throw lessonsError

    return { course, lessons: lessons ?? [] }
}

/**
 * Save course + ordered lessons in one transaction (instructor_save_course
 * RPC). Lessons dropped from the list are deleted. Returns the course id.
 */
export async function saveCourse(course, lessons) {
    const minutes = lessons.reduce((sum, l) => sum + (Number(l.duration_min) || 0), 0)
    const { data, error } = await supabase.rpc('instructor_save_course', {
        p_course: {
            id: course.id ?? null,
            title: course.title,
            subject: course.subject,
            description: course.description,
            color: course.color,
            icon: course.icon,
            estimated_hours: Math.round((minutes / 60) * 2) / 2,
            is_published: !!course.is_published
        },
        p_lessons: lessons.map(l => ({
            id: l.id ?? null,
            title: l.title,
            summary: l.summary,
            content: l.content,
            duration_min: Number(l.duration_min) || 10,
            difficulty: l.difficulty,
            // Only send the quiz when it changed: replacing it gives it a new
            // id, which would drop students' existing attempts.
            ...(l.quizDirty ? { quiz: toQuizPayload(l.quiz) } : {})
        }))
    })
    if (error) throw error
    return data
}

/**
 * Flip just is_published, without touching lessons/quizzes - used by the
 * preview page's one-click Publish button, where there's no full lesson
 * edit payload to (re)send like there is in the course editor.
 */
export async function publishCourse(courseId, publish) {
    const userId = await currentUserId()
    const { error } = await supabase
        .from('courses')
        .update({ is_published: publish, updated_at: new Date().toISOString() })
        .eq('id', courseId)
        .eq('created_by', userId)
    if (error) throw error
}

export async function deleteCourse(courseId) {
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    if (error) throw error
}

// ---------- Activity log ----------

/** This instructor's own publish/draft history (newest first). */
export async function listMyPublishLog(limit = 30) {
    const { data, error } = await supabase
        .from('course_publish_log')
        .select('id, course_id, action, course_title, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        if (/could not find the table|schema cache/i.test(error.message ?? '')) return []
        throw error
    }
    return data ?? []
}
