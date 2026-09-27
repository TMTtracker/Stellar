// Editor-side quiz shape (keys are client-only, for React lists):
// { title, passing_score, questions: [{ key, question, explanation,
//   options: [{ key, text, is_correct }] }] }

const newKey = () => crypto.randomUUID()

export const MAX_OPTIONS = 6
export const MIN_OPTIONS = 2

export function blankQuestion() {
    return {
        key: newKey(),
        question: '',
        explanation: '',
        options: [
            { key: newKey(), text: '', is_correct: true },
            { key: newKey(), text: '', is_correct: false },
            { key: newKey(), text: '', is_correct: false },
            { key: newKey(), text: '', is_correct: false }
        ]
    }
}

export function blankOption() {
    return { key: newKey(), text: '', is_correct: false }
}

/** Build an editor quiz from AI output or DB rows ({ question, explanation, options: [{ text|option_text, is_correct }] }). */
export function toEditorQuiz({ title = '', passing_score = 70, questions = [] } = {}) {
    return {
        title,
        passing_score,
        questions: questions.map(q => ({
            key: newKey(),
            question: q.question ?? '',
            explanation: q.explanation ?? '',
            options: (q.options ?? []).map(o => ({ key: newKey(), text: o.text ?? o.option_text ?? '', is_correct: !!o.is_correct }))
        }))
    }
}

/** Strip client keys for the instructor_save_course RPC. */
export function toQuizPayload(quiz) {
    if (!quiz) return null
    return {
        title: quiz.title ?? '',
        passing_score: Number(quiz.passing_score) || 70,
        questions: quiz.questions.map(q => ({
            question: q.question,
            explanation: q.explanation,
            options: q.options.map(o => ({ text: o.text, is_correct: o.is_correct }))
        }))
    }
}

/** First problem with a quiz as a readable message, or '' if it is valid. Mirrors the server checks in 019. */
export function quizProblem(quiz) {
    if (!quiz) return ''
    if (quiz.questions.length === 0) return 'The quiz has no questions.'
    for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i]
        if (!q.question.trim()) return `Question ${i + 1} is empty.`
        if (q.options.length < MIN_OPTIONS) return `Question ${i + 1} needs at least ${MIN_OPTIONS} answers.`
        if (q.options.some(o => !o.text.trim())) return `Question ${i + 1} has an empty answer.`
        if (q.options.filter(o => o.is_correct).length !== 1) return `Question ${i + 1} needs exactly one correct answer.`
    }
    return ''
}
