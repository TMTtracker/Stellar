import { useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, Trophy, X, Zap, Coins } from 'lucide-react'
import { getBestQuizScore, getQuizAttempts, submitQuizAttempt } from '@/services/quizzes'
import { materialIconFor } from '@/lib/materials'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuizTaker({ quiz, onPassed, xpReward, coinsReward, materialName, materialQty }) {
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

    async function handleSubmit() {
        if (!allAnswered || submitting) return
        setSubmitting(true)
        setError('')
        try {
            const res = await submitQuizAttempt({ quiz, answers })
            setResult(res)
            await refreshAttempts()
            if (res.passed) onPassed?.()
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
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF3EE] text-[#6A6F73] font-medium'>
                    <Trophy size={12} /> Pass at {quiz.passing_score ?? 70}%
                </span>
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] text-[#8A6D2B] font-medium'>
                    <Zap size={12} /> {xpReward ?? 0} XP
                </span>
                <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] text-[#8A6D2B] font-medium'>
                    <Coins size={12} /> {coinsReward ?? 0} coins
                </span>
                {materialQty > 0 && (() => {
                    const MaterialIcon = materialIconFor(materialName)
                    return (
                        <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF0D9] text-[#8A6D2B] font-medium'>
                            <MaterialIcon size={12} /> {materialQty} {materialName}
                        </span>
                    )
                })()}
                {best != null && (
                    <span className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0DF] text-[#3E7A42] font-medium'>
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
                <div className={`rounded-2xl border p-5 mb-6 ${result.passed ? 'border-[#A9D8AE] bg-[#EFF7EE]' : 'border-[#E5C0B5] bg-[#FBF1ED]'}`}>
                    <div className='flex items-center gap-3'>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold ${result.passed ? 'bg-[#A9D8AE] text-white' : 'bg-[#C4634F] text-white'}`}>
                            {result.score}%
                        </div>
                        <div>
                            <p className='font-bold'>{result.passed ? 'Passed — nice work!' : 'Not quite — try again'}</p>
                            <p className='text-xs text-[#6A6F73] mt-0.5'>
                                {result.passed
                                    ? 'Lesson marked complete. Your attempt was saved.'
                                    : `You need ${quiz.passing_score ?? 70}% to pass. Review the explanations below.`}
                            </p>
                            {result.passed && rewardsKnown && (
                                <p className='flex items-center gap-2 text-xs font-bold mt-1.5 text-[#3E7A42]'>
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
                            className='ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-[#C9DDC4] hover:border-[#A9D8AE]'
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
                        <div key={q.id} className='bg-white rounded-2xl border border-[#C9DDC4] p-5'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-1'>QUESTION {qi + 1}</p>
                            <p className='font-bold text-sm leading-snug mb-4'>{q.question}</p>

                            <div className='flex flex-col gap-2'>
                                {q.options.map((opt, oi) => {
                                    const selected = answers[q.id] === opt.id
                                    const isCorrectOpt = !!opt.is_correct
                                    let cls = 'border-[#C9DDC4] hover:border-[#A9D8AE]'
                                    let badgeCls = 'bg-[#EFF3EE] text-[#6A6F73]'
                                    let Icon = null

                                    if (result) {
                                        if (isCorrectOpt) {
                                            cls = 'border-[#A9D8AE] bg-[#EFF7EE]'
                                            badgeCls = 'bg-[#A9D8AE] text-white'
                                            Icon = <Check size={13} strokeWidth={3} className='ml-auto text-[#3E7A42] shrink-0' />
                                        } else if (selected) {
                                            cls = 'border-[#C4634F] bg-[#FBF1ED]'
                                            badgeCls = 'bg-[#C4634F] text-white'
                                            Icon = <X size={13} strokeWidth={3} className='ml-auto text-[#C4634F] shrink-0' />
                                        }
                                    } else if (selected) {
                                        cls = 'border-[#A9D8AE] bg-[#EFF7EE]'
                                        badgeCls = 'bg-[#A9D8AE] text-white'
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            disabled={!!result}
                                            onClick={() => pick(q.id, opt.id)}
                                            className={`flex items-center gap-3 text-left text-sm px-4 py-3 rounded-xl border transition-colors disabled:cursor-default ${cls}`}
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
                                <p className={`text-xs mt-3 px-3 py-2 rounded-lg ${graded?.isRight ? 'bg-[#EFF7EE] text-[#3E7A42]' : 'bg-[#FBF3E4] text-[#8A6D2B]'}`}>
                                    {graded?.isRight ? 'Correct. ' : ''}{q.explanation}
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>

            {error && <p className='text-sm text-red-600 mt-4'>{error}</p>}

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
                    <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-2'>RECENT ATTEMPTS</p>
                    <div className='flex flex-wrap gap-2'>
                        {attempts.map(a => (
                            <span
                                key={a.id}
                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${a.passed ? 'bg-[#E1F0DF] text-[#3E7A42]' : 'bg-[#EFF3EE] text-[#6A6F73]'}`}
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
