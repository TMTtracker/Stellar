import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ListChecks, Loader2, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import { generateQuizForLesson, isAiConfigured } from '@/services/ai'
import { htmlToText } from '@/lib/lessonContent'
import { blankOption, blankQuestion, MAX_OPTIONS, MIN_OPTIONS, toEditorQuiz } from '@/lib/quiz'

const fieldClass =
    'w-full rounded-lg border border-[#D5E3D1] dark:border-[#262E28] bg-white dark:bg-[#14171A] px-3 py-2 text-sm text-[#1F2225] dark:text-[#F2F5F0] outline-none focus:border-[#A9D8AE] placeholder:text-[#9AA39C] dark:placeholder:text-[#5C6A5F]'
const correctFieldClass = fieldClass
    .replace('border-[#D5E3D1] dark:border-[#262E28] bg-white dark:bg-[#14171A]', 'border-[#A9D8AE] dark:border-[#3E6B45] bg-[#F1F9EF] dark:bg-[#16241A]')
const smallBtn =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50'

/**
 * Quiz for one lecture. `onChange(quiz, { fresh })` - quiz is null when
 * removed; `fresh` marks it as (re)generated from the current lecture text.
 */
export default function QuizEditor({ lessonTitle, lessonHtml, quiz, stale, onChange }) {
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState('')
    const [confirm, setConfirm] = useState(null) // 'regenerate' | 'remove'
    const abortRef = useRef(null)

    useEffect(() => () => abortRef.current?.abort(), [])

    const aiReady = isAiConfigured()
    const lectureText = htmlToText(lessonHtml || '')
    const canGenerate = aiReady && lectureText.length > 0 && !generating

    async function handleGenerate() {
        setConfirm(null)
        setError('')
        setGenerating(true)
        const controller = new AbortController()
        abortRef.current = controller
        try {
            const draft = await generateQuizForLesson({ title: lessonTitle, text: lectureText }, { signal: controller.signal })
            onChange(toEditorQuiz({ title: quiz?.title ?? '', passing_score: quiz?.passing_score ?? 70, questions: draft.questions }), { fresh: true })
        } catch (e) {
            if (e?.name !== 'AbortError') setError(e.message ?? 'Quiz generation failed.')
        } finally {
            abortRef.current = null
            setGenerating(false)
        }
    }

    function patch(next) {
        onChange({ ...quiz, ...next })
    }

    function updateQuestion(key, fn) {
        patch({ questions: quiz.questions.map(q => (q.key === key ? fn(q) : q)) })
    }

    function moveQuestion(i, dir) {
        const j = i + dir
        if (j < 0 || j >= quiz.questions.length) return
        const copy = [...quiz.questions]
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
        patch({ questions: copy })
    }

    const header = (
        <div className='flex items-center gap-3'>
            <span className='w-9 h-9 rounded-xl bg-[#EFF7EE] dark:bg-[#16241A] flex items-center justify-center shrink-0'>
                <ListChecks size={17} className='text-[#3E7A42] dark:text-[#8FE0A0]' />
            </span>
            <div className='flex-1 min-w-0'>
                <p className='font-bold text-[#1F2225] dark:text-[#F2F5F0]'>Quiz</p>
                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>
                    {quiz
                        ? `${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'} · students pass at ${quiz.passing_score}% and the lecture completes automatically`
                        : 'Optional. Students take it at the end of the lecture; passing marks the lecture complete.'}
                </p>
            </div>
        </div>
    )

    return (
        <section className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-5 flex flex-col gap-4'>
            {header}

            {!quiz && (
                <div className='flex flex-wrap items-center gap-2'>
                    <button type='button' onClick={handleGenerate} disabled={!canGenerate} className={`${smallBtn} bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C] hover:bg-[#2A2E2B]`}>
                        {generating ? <Loader2 size={14} className='animate-spin' /> : <Sparkles size={14} />}
                        {generating ? 'Writing questions…' : 'Generate quiz from this lecture'}
                    </button>
                    <button type='button' onClick={() => onChange({ title: '', passing_score: 70, questions: [blankQuestion()] }, { fresh: true })} disabled={generating} className={`${smallBtn} border border-[#C9DDC4] dark:border-[#262E28] text-[#1F2225] dark:text-[#F2F5F0] hover:border-[#A9D8AE]`}>
                        <Plus size={14} /> Write questions manually
                    </button>
                    {!aiReady && <span className='text-xs text-[#8A6A2E] dark:text-[#E3BE72]'>AI isn&apos;t configured (VITE_OLLAMA_API_KEY).</span>}
                    {aiReady && !lectureText && <span className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>Write the lecture first to generate a quiz from it.</span>}
                </div>
            )}

            {error && (
                <p className='flex items-start gap-2 text-sm text-[#B03A31] bg-[#FDEEEE] dark:bg-[#2A1A17] dark:text-[#E39B8B] rounded-lg px-3 py-2'>
                    <X size={15} className='mt-0.5 shrink-0' /> {error}
                </p>
            )}

            {quiz && (
                <>
                    {stale && (
                        <div className='flex flex-wrap items-center gap-3 text-sm text-[#8A6A2E] bg-[#FBF3E2] dark:bg-[#2A2417] dark:text-[#E3BE72] rounded-lg px-3 py-2'>
                            <AlertTriangle size={15} className='shrink-0' />
                            <span className='flex-1'>You edited the lecture after this quiz was made. Check the questions still match.</span>
                            {aiReady && (
                                <button type='button' onClick={() => setConfirm('regenerate')} disabled={!canGenerate} className='font-medium underline underline-offset-2'>Regenerate</button>
                            )}
                        </div>
                    )}

                    <div className='flex flex-wrap items-end gap-3'>
                        <div className='flex-1 min-w-[200px]'>
                            <label className='block text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-1'>QUIZ TITLE</label>
                            <input className={fieldClass} value={quiz.title} onChange={e => patch({ title: e.target.value })} placeholder={`Quiz: ${lessonTitle || 'Untitled lesson'}`} />
                        </div>
                        <div className='w-[120px]'>
                            <label className='block text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-1'>PASS MARK %</label>
                            <input type='number' min={50} max={100} step={5} className={fieldClass} value={quiz.passing_score} onChange={e => patch({ passing_score: e.target.value })} />
                        </div>
                        <div className='flex items-center gap-2'>
                            {confirm ? (
                                <>
                                    <span className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>{confirm === 'regenerate' ? 'Replace all questions?' : 'Remove this quiz?'}</span>
                                    <button type='button' onClick={() => setConfirm(null)} className={`${smallBtn} hover:bg-[#EFF3EE] dark:hover:bg-[#1B211C]`}>Cancel</button>
                                    <button
                                        type='button'
                                        onClick={() => (confirm === 'regenerate' ? handleGenerate() : (setConfirm(null), onChange(null)))}
                                        className={`${smallBtn} text-white ${confirm === 'regenerate' ? 'bg-[#141814]' : 'bg-[#C4453A]'}`}
                                    >
                                        {confirm === 'regenerate' ? 'Regenerate' : 'Remove'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type='button' onClick={() => setConfirm('regenerate')} disabled={!canGenerate} title={!aiReady ? 'AI is not configured' : !lectureText ? 'Lecture is empty' : undefined} className={`${smallBtn} border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE]`}>
                                        {generating ? <Loader2 size={14} className='animate-spin' /> : <RefreshCw size={14} />}
                                        {generating ? 'Writing questions…' : 'Regenerate from lecture'}
                                    </button>
                                    <button type='button' onClick={() => setConfirm('remove')} disabled={generating} className={`${smallBtn} border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#C4453A] hover:text-[#C4453A]`}>
                                        <Trash2 size={14} /> Remove quiz
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <ol className='flex flex-col gap-3'>
                        {quiz.questions.map((q, i) => (
                            <li key={q.key} className='rounded-xl border border-[#E4ECE2] dark:border-[#262E28] bg-[#FAFCF9] dark:bg-[#111412] p-4'>
                                <div className='flex items-start gap-2 mb-3'>
                                    <span className='w-6 h-6 mt-1.5 rounded-md bg-[#141814] text-white text-[11px] font-bold flex items-center justify-center shrink-0'>{i + 1}</span>
                                    <input
                                        className={fieldClass}
                                        value={q.question}
                                        onChange={e => updateQuestion(q.key, x => ({ ...x, question: e.target.value }))}
                                        placeholder='Question'
                                        aria-label={`Question ${i + 1}`}
                                    />
                                    <button type='button' onClick={() => moveQuestion(i, -1)} disabled={i === 0} aria-label='Move question up' className='w-8 h-9 flex items-center justify-center text-[#6A6F73] hover:text-[#1F2225] dark:hover:text-white disabled:opacity-30'><ArrowUp size={14} /></button>
                                    <button type='button' onClick={() => moveQuestion(i, 1)} disabled={i === quiz.questions.length - 1} aria-label='Move question down' className='w-8 h-9 flex items-center justify-center text-[#6A6F73] hover:text-[#1F2225] dark:hover:text-white disabled:opacity-30'><ArrowDown size={14} /></button>
                                    <button
                                        type='button'
                                        onClick={() => patch({ questions: quiz.questions.filter(x => x.key !== q.key) })}
                                        disabled={quiz.questions.length === 1}
                                        title={quiz.questions.length === 1 ? 'A quiz needs at least one question — use "Remove quiz" instead' : 'Delete question'}
                                        aria-label='Delete question'
                                        className='w-8 h-9 flex items-center justify-center text-[#6A6F73] hover:text-[#C4453A] disabled:opacity-30'
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className='flex flex-col gap-2 pl-8'>
                                    {q.options.map((o, oi) => (
                                        <div key={o.key} className='flex items-center gap-2'>
                                            <input
                                                type='radio'
                                                name={`correct-${q.key}`}
                                                checked={o.is_correct}
                                                onChange={() => updateQuestion(q.key, x => ({ ...x, options: x.options.map(y => ({ ...y, is_correct: y.key === o.key })) }))}
                                                aria-label={`Mark answer ${oi + 1} correct`}
                                                title='Correct answer'
                                                className='accent-[#6FAE73] w-4 h-4 shrink-0 cursor-pointer'
                                            />
                                            <input
                                                className={o.is_correct ? correctFieldClass : fieldClass}
                                                value={o.text}
                                                onChange={e => updateQuestion(q.key, x => ({ ...x, options: x.options.map(y => (y.key === o.key ? { ...y, text: e.target.value } : y)) }))}
                                                placeholder={`Answer ${oi + 1}`}
                                                aria-label={`Answer ${oi + 1}`}
                                            />
                                            <button
                                                type='button'
                                                onClick={() => updateQuestion(q.key, x => {
                                                    const options = x.options.filter(y => y.key !== o.key)
                                                    if (o.is_correct && options.length) options[0] = { ...options[0], is_correct: true }
                                                    return { ...x, options }
                                                })}
                                                disabled={q.options.length <= MIN_OPTIONS}
                                                aria-label='Remove answer'
                                                className='w-7 h-7 flex items-center justify-center text-[#6A6F73] hover:text-[#C4453A] disabled:opacity-30 shrink-0'
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className='flex items-center justify-between gap-2'>
                                        <button
                                            type='button'
                                            onClick={() => updateQuestion(q.key, x => ({ ...x, options: [...x.options, blankOption()] }))}
                                            disabled={q.options.length >= MAX_OPTIONS}
                                            className='text-xs font-medium text-[#3E7A42] dark:text-[#8FE0A0] disabled:opacity-40 self-start'
                                        >
                                            + Add answer
                                        </button>
                                        <span className='text-[11px] text-[#6A6F73] dark:text-[#8FA893]'>Select the circle next to the correct answer</span>
                                    </div>
                                    <input
                                        className={fieldClass}
                                        value={q.explanation}
                                        onChange={e => updateQuestion(q.key, x => ({ ...x, explanation: e.target.value }))}
                                        placeholder='Explanation shown after answering (optional)'
                                        aria-label={`Explanation for question ${i + 1}`}
                                    />
                                </div>
                            </li>
                        ))}
                    </ol>

                    <button
                        type='button'
                        onClick={() => patch({ questions: [...quiz.questions, blankQuestion()] })}
                        disabled={quiz.questions.length >= 15}
                        className='self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-dashed border-[#C9DDC4] dark:border-[#2A352C] text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#F2F5F0] disabled:opacity-40'
                    >
                        <Plus size={15} /> Add question
                    </button>
                </>
            )}
        </section>
    )
}
