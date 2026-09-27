import { useEffect, useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, Trophy, X, Zap, Coins } from 'lucide-react'
import { getBestQuizScore, getQuizAttempts, gradeQuiz, submitQuizAttempt } from '@/services/quizzes'
import { materialIconFor } from '@/lib/materials'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

// `preview`: instructor view - graded locally, nothing saved, no rewards.
export default function QuizTaker({ quiz, onPassed, xpReward, coinsReward, materialName, materialQty, preview = false }) {
    const questions = useMemo(() => quiz?.questions ?? [], [quiz])
    const [answers, setAnswers] = useState({})
    const [result, setResult] = useState(null)
    const [attempts, setAttempts] = useState(null)
    const [best, setBest] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const answeredCount = Object.keys(answers).length
    const allAnswered = questions.length > 0 && answeredCount === questions.length

    function pick(questionId, optionId) {
        if (result) return
        setAnswers(prev => ({ ...prev, [questionId]: optionId }))
    }

    async function refreshAttempts() {
        if (preview) return
        try {
            const [list, bestScore] = await Promise.all([
                getQuizAttempts(quiz.id, { limit: 5 }),
                getBestQuizScore(quiz.id)
            ])
            setAttempts(list)
            setBest(bestScore)
        } catch {
            // history is best-effort; the graded result is already shown
        }
    }

    // Load this quiz's own real history on mount - previously this only ran
    // after a fresh submit, so "Recent Attempts"/"Best" stayed blank (not
    // wrong, just empty) for a quiz you'd genuinely attempted in an earlier
    // session, until you submitted it again. The parent now also remounts
    // this component per quiz (key={quiz.id}) so this effect can't pick up
    // a previous quiz's stale history either.
    useEffect(() => {
        refreshAttempts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz?.id])

    async function handleSubmit() {
        if (!allAnswered || submitting) return
        setSubmitting(true)
        setError('')
        try {
            const res = preview ? gradeQuiz({ quiz, answers }) : await submitQuizAttempt({ quiz, answers })
            setResult(res)
            await refreshAttempts()
            if (res.passed && !preview) onPassed?.()
        } catch (e) {
            setError(e.message ?? 'Failed to submit quiz')
        } finally {
            setSubmitting(false)
        }
    }

    function handleRetry() {
        setAnswers({})
        setResult(null)
        setError('')
    }

    if (!quiz) return null

    return (
        <div>
            {/* Quiz header stats */}
            <div className='flex flex-wrap items-center gap-2 mb-5 text-xs'>
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893] font-medium'>
                    <Trophy size={12} /> Pass at {quiz.passing_score ?? 70}%
                </span>
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] dark:bg-[#2A2417] text-[#8A6D2B] dark:text-[#E3BE72] font-medium'>
                    <Zap size={12} /> {xpReward ?? 0} XP
                </span>
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] dark:bg-[#2A2417] text-[#8A6D2B] dark:text-[#E3BE72] font-medium'>
                    <Coins size={12} /> {coinsReward ?? 0} coins
                </span>
                {materialQty > 0 && (() => {
                    const MaterialIcon = materialIconFor(materialName)
                    return (
                        <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] dark:bg-[#2A2417] text-[#8A6D2B] dark:text-[#E3BE72] font-medium'>
                            <MaterialIcon size={12} /> {materialQty} {materialName}
                        </span>
                    )
                })()}
                {best != null && (
                    <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0] font-medium'>
                        Best: {best}%
                    </span>
                )}
            </div>

            {/* Result banner */}
            {result && (() => {
                const earnedXp = result.lessonReward?.awarded ? (result.lessonReward.xp ?? 0) : 0
                const earnedCoins = result.lessonReward?.awarded ? (result.lessonReward.coins ?? 0) : 0
                const earnedMaterialName = result.lessonReward?.awarded ? result.lessonReward.material_name : null
                const earnedMaterialQty = result.lessonReward?.awarded ? (result.lessonReward.material_qty ?? 0) : 0
                const MaterialIcon = earnedMaterialName ? materialIconFor(earnedMaterialName) : null
                const rewardsKnown = !!result.lessonReward
                return (
                <div className={`rounded-2xl border p-5 mb-6 ${result.passed ? 'border-[#A9D8AE] bg-[#EFF7EE] dark:bg-[#16241A]' : 'border-[#E5C0B5] dark:border-[#4A2A22] bg-[#FBF1ED] dark:bg-[#2A1716]'}`}>
                    <div className='flex items-center gap-3'>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold ${result.passed ? 'bg-[#A9D8AE] text-white' : 'bg-[#C4634F] text-white'}`}>
                            {result.score}%
                        </div>
                        <div>
                            <p className='font-bold text-[#1F2225] dark:text-[#F2F5F0]'>{result.passed ? 'Passed — nice work!' : 'Not quite — try again'}</p>
                            <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] mt-0.5'>
                                {preview
                                    ? `Preview only — nothing was saved. ${result.passed ? 'A student would pass and complete this lesson.' : `Students need ${quiz.passing_score ?? 70}% to pass.`}`
                                    : result.passed
                                    ? 'Lesson marked complete. Your attempt was saved.'
                                    : `You need ${quiz.passing_score ?? 70}% to pass. Review the explanations below.`}
                            </p>
                            {result.passed && rewardsKnown && (
                                <p className='flex items-center gap-2 text-xs font-bold mt-1.5 text-[#3E7A42] dark:text-[#8FE0A0]'>
                                    {earnedXp > 0 || earnedCoins > 0 ? (
                                        <>
                                            <span className='flex items-center gap-1'><Zap size={12} /> +{earnedXp} XP</span>
                                            <span className='flex items-center gap-1'><Coins size={12} /> +{earnedCoins}</span>
                                            {earnedMaterialQty > 0 && (
                                                <span className='flex items-center gap-1'>
                                                    <MaterialIcon size={12} /> +{earnedMaterialQty} {earnedMaterialName}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        'Rewards already claimed for this lesson.'
                                    )}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleRetry}
                            className='ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] text-[#1F2225] dark:text-[#F2F5F0] hover:border-[#A9D8AE]'
                        >
                            <RotateCcw size={13} /> Retry
                        </button>
                    </div>
                </div>
                )
            })()}

            {/* Questions */}
            <div className='flex flex-col gap-5'>
                {questions.map((q, qi) => {
                    const graded = result?.graded?.find(g => g.questionId === q.id)
                    return (
                        <div key={q.id} className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-5'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-1'>QUESTION {qi + 1}</p>
                            <p className='font-bold text-sm leading-snug mb-4 text-[#1F2225] dark:text-[#F2F5F0]'>{q.question}</p>

                            <div className='flex flex-col gap-2'>
                                {q.options.map((opt, oi) => {
                                    const selected = answers[q.id] === opt.id
                                    const isCorrectOpt = !!opt.is_correct
                                    let cls = 'border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE]'
                                    let badgeCls = 'bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893]'
                                    let Icon = null

                                    if (result) {
                                        if (isCorrectOpt) {
                                            cls = 'border-[#A9D8AE] bg-[#EFF7EE] dark:bg-[#16241A]'
                                            badgeCls = 'bg-[#A9D8AE] text-white'
                                            Icon = <Check size={13} strokeWidth={3} className='ml-auto text-[#3E7A42] dark:text-[#8FE0A0] shrink-0' />
                                        } else if (selected) {
                                            cls = 'border-[#C4634F] bg-[#FBF1ED] dark:bg-[#2A1716]'
                                            badgeCls = 'bg-[#C4634F] text-white'
                                            Icon = <X size={13} strokeWidth={3} className='ml-auto text-[#C4634F] dark:text-[#E39B8B] shrink-0' />
                                        }
                                    } else if (selected) {
                                        cls = 'border-[#A9D8AE] bg-[#EFF7EE] dark:bg-[#16241A]'
                                        badgeCls = 'bg-[#A9D8AE] text-white'
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            disabled={!!result}
                                            onClick={() => pick(q.id, opt.id)}
                                            className={`flex items-center gap-3 text-left text-sm px-4 py-3 rounded-xl border transition-colors disabled:cursor-default text-[#1F2225] dark:text-[#F2F5F0] ${cls}`}
                                        >
                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${badgeCls}`}>
                                                {LETTERS[oi] ?? oi + 1}
                                            </span>
                                            <span className='flex-1'>{opt.option_text}</span>
                                            {Icon}
                                        </button>
                                    )
                                })}
                            </div>

                            {result && q.explanation && (
                                <p className={`text-xs mt-3 px-3 py-2 rounded-lg ${graded?.isRight ? 'bg-[#EFF7EE] dark:bg-[#16241A] text-[#3E7A42] dark:text-[#8FE0A0]' : 'bg-[#FBF3E4] dark:bg-[#2A2417] text-[#8A6D2B] dark:text-[#E3BE72]'}`}>
                                    {graded?.isRight ? 'Correct. ' : ''}{q.explanation}
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>

            {error && <p className='text-sm text-red-600 dark:text-red-400 mt-4'>{error}</p>}

            {!result && (
                <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className='mt-6 w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-sm bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    {submitting ? 'Submitting…' : allAnswered ? `Submit answers (${answeredCount}/${questions.length})` : `Answer all questions (${answeredCount}/${questions.length})`}
                </button>
            )}

            {/* Attempt history */}
            {attempts && attempts.length > 0 && (
                <div className='mt-6'>
                    <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-2'>RECENT ATTEMPTS</p>
                    <div className='flex flex-wrap gap-2'>
                        {attempts.map(a => (
                            <span
                                key={a.id}
                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${a.passed ? 'bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]' : 'bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893]'}`}
                            >
                                {a.passed ? <Check size={12} strokeWidth={3} /> : <Lock size={12} />}
                                {a.score}% · {new Date(a.completed_at).toLocaleDateString()}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
