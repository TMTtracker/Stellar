import { supabase } from './supabaseClient'
import { completeLesson } from './courses'

// ---------- Quiz fetching ----------

/**
 * Quiz for a lesson, with questions + options nested and ordered.
 * Returns null when the lesson has no quiz.
 */
export async function getQuizForLesson(lessonId) {
    const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .maybeSingle()
    if (quizError) throw quizError
    if (!quiz) return null

    const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('position', { ascending: true })
    if (qError) throw qError

    const questionIds = (questions ?? []).map(q => q.id)
    let optionsByQuestion = {}
    if (questionIds.length > 0) {
        const { data: options, error: oError } = await supabase
            .from('quiz_options')
            .select('*')
            .in('question_id', questionIds)
            .order('position', { ascending: true })
        if (oError) throw oError
        for (const o of options ?? []) {
            ;(optionsByQuestion[o.question_id] ??= []).push(o)
        }
    }

    return {
        ...quiz,
        questions: (questions ?? []).map(q => ({
            ...q,
            options: optionsByQuestion[q.id] ?? []
        }))
    }
}

// ---------- Attempts ----------

export async function getQuizAttempts(quizId, { limit = 10 } = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })
        .limit(limit)
    if (error) throw error
    return data ?? []
}

export async function getBestQuizScore(quizId) {
    const attempts = await getQuizAttempts(quizId, { limit: 50 })
    if (attempts.length === 0) return null
    return attempts.reduce((best, a) => Math.max(best, a.score ?? 0), 0)
}

/** Set of lesson ids in a course that have a published quiz (for badges). */
export async function getLessonsWithQuiz(courseId) {
    const { data: lessons, error: lError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
    if (lError) throw lError
    const ids = (lessons ?? []).map(l => l.id)
    if (ids.length === 0) return new Set()

    const { data: quizzes, error: qError } = await supabase
        .from('quizzes')
        .select('lesson_id')
        .in('lesson_id', ids)
        .eq('is_published', true)
    if (qError) throw qError
    return new Set((quizzes ?? []).map(q => q.lesson_id))
}

// ---------- Submission + grading (client-side MVP) ----------

/**
 * Grade answers locally (is_correct is readable per RLS in the MVP),
 * persist the attempt, and auto-complete the lesson when passed.
 *
 * @param answers {Record<questionId, optionId>}
 */
export async function submitQuizAttempt({ quiz, answers }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Must be signed in to submit a quiz')

    const { data: lesson } = await supabase
        .from('lessons')
        .select('course_id')
        .eq('id', quiz.lesson_id)
        .single()
    if (lesson) {
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id)
            .eq('course_id', lesson.course_id)
            .maybeSingle()
        if (!enrollment) throw new Error('Enroll in this course before submitting quizzes')
    }

    const questions = quiz.questions ?? []
    let earned = 0
    let total = 0
    const graded = questions.map(q => {
        const points = q.points ?? 1
        total += points
        const pickedId = answers[q.id]
        const correct = q.options.find(o => o.is_correct)
        const isRight = !!pickedId && !!correct && pickedId === correct.id
        if (isRight) earned += points
        return { questionId: q.id, pickedId: pickedId ?? null, correctId: correct?.id ?? null, isRight, points }
    })

    const score = total > 0 ? Math.round((earned / total) * 100) : 0
    const passed = score >= (quiz.passing_score ?? 70)

    const { data: attempt, error } = await supabase
        .from('quiz_attempts')
        .insert({
            user_id: user.id,
            quiz_id: quiz.id,
            lesson_id: quiz.lesson_id,
            score,
            passed,
            answers
        })
        .select()
        .single()
    if (error) throw error

    let lessonCompleted = false
    let lessonReward = null
    if (passed) {
        try {
            const { data: lesson } = await supabase
                .from('lessons')
                .select('course_id')
                .eq('id', quiz.lesson_id)
                .single()
            if (lesson) {
                // Awards lesson XP/coins/material once-ever (no-op on re-pass).
                // This is the only reward granted for passing - quizzes no
                // longer have a separate bonus on top of it.
                const res = await completeLesson({ lessonId: quiz.lesson_id, courseId: lesson.course_id })
                lessonReward = res.reward
                lessonCompleted = true
            }
        } catch {
            // attempt is already saved; lesson completion is best-effort here
        }
    }

    return { attempt, graded, score, passed, lessonCompleted, lessonReward }
}
