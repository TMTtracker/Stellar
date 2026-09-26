import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { extractPdfText } from '@/lib/pdfText'
import { htmlToText, markdownToHtml, sanitizeLessonHtml } from '@/lib/lessonContent'
import { toEditorQuiz } from '@/lib/quiz'
import { generateCourseFromText, generateQuizForLesson, isAiConfigured } from '@/services/ai'

const MAX_FILE_MB = 25

/**
 * Optional: upload a PDF and let the AI draft lectures from it. Drafts are
 * handed to the editor via onGenerated(draft, mode) and stay fully
 * editable - nothing is saved until the instructor saves the course.
 */
export default function PdfImportPanel({ hasLessons, onGenerated }) {
    const [file, setFile] = useState(null)
    const [notes, setNotes] = useState('')
    const [mode, setMode] = useState('append')
    const [phase, setPhase] = useState('idle') // idle | reading | generating
    const [progress, setProgress] = useState('')
    const [error, setError] = useState('')
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef(null)
    const abortRef = useRef(null)

    useEffect(() => () => abortRef.current?.abort(), [])

    const busy = phase !== 'idle'
    const aiReady = isAiConfigured()

    function pickFile(f) {
        setError('')
        if (!f) return
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
            setError('Please choose a PDF file.')
            return
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
            setError(`That PDF is larger than ${MAX_FILE_MB} MB.`)
            return
        }
        setFile(f)
    }

    async function handleGenerate() {
        if (!file) return
        const controller = new AbortController()
        abortRef.current = controller
        setError('')

        try {
            setPhase('reading')
            setProgress('Reading PDF…')
            const { text, pages } = await extractPdfText(file, {
                onProgress: (i, n) => setProgress(`Reading page ${i} of ${n}…`)
            })
            if (controller.signal.aborted) return

            setPhase('generating')
            setProgress(`Writing lectures from ${pages} page${pages === 1 ? '' : 's'}… this can take a minute.`)
            const draft = await generateCourseFromText(text, {
                signal: controller.signal,
                fileName: file.name,
                guidance: notes
            })

            const lessons = draft.lessons.map(l => ({ ...l, content: sanitizeLessonHtml(markdownToHtml(l.content)), quiz: null, quizDirty: false }))

            // One quiz per lecture, sequentially. A failed quiz only leaves
            // that lecture without one - the lectures themselves are kept.
            for (let i = 0; i < lessons.length; i++) {
                if (controller.signal.aborted) return
                setProgress(`Writing quiz ${i + 1} of ${lessons.length}…`)
                try {
                    const quiz = await generateQuizForLesson(
                        { title: lessons[i].title, text: htmlToText(lessons[i].content) },
                        { signal: controller.signal }
                    )
                    lessons[i] = { ...lessons[i], quiz: toEditorQuiz(quiz), quizDirty: true }
                } catch (e) {
                    if (e?.name === 'AbortError') return
                    console.warn(`[ai] quiz for "${lessons[i].title}" failed:`, e.message)
                }
            }

            onGenerated({ ...draft, lessons }, hasLessons ? mode : 'replace')
            setFile(null)
            setNotes('')
            setProgress(draft.truncated ? 'Done. The PDF was long, so only the first part was used.' : '')
        } catch (e) {
            if (e?.name !== 'AbortError') setError(e.message ?? 'Generation failed.')
            setProgress('')
        } finally {
            abortRef.current = null
            setPhase('idle')
        }
    }

    function handleCancel() {
        abortRef.current?.abort()
        setPhase('idle')
        setProgress('')
    }

    return (
        <div className='rounded-2xl border border-dashed border-[#A9D8AE] bg-[#F4FAF3] dark:bg-[#121A14] dark:border-[#2F4A33] p-6'>
            <div className='flex items-start gap-3 mb-4'>
                <span className='w-9 h-9 rounded-xl bg-[#141814] dark:bg-[#A9D8AE] flex items-center justify-center shrink-0'>
                    <Sparkles size={16} className='text-[#A9D8AE] dark:text-[#0B0D0C]' />
                </span>
                <div>
                    <p className='font-bold text-[#1F2225] dark:text-[#F2F5F0]'>Generate lectures from a PDF <span className='ml-1 text-[10px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] bg-white dark:bg-[#1B211C] border border-[#D5E3D1] dark:border-[#262E28] px-2 py-0.5 rounded-full align-middle'>OPTIONAL</span></p>
                    <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-0.5'>Upload your notes, slides or a textbook chapter. The AI drafts structured lectures, each with a quiz, that you can then edit freely.</p>
                </div>
            </div>

            {!aiReady && (
                <p className='text-sm text-[#8A6A2E] bg-[#FBF3E2] dark:bg-[#2A2417] dark:text-[#E3BE72] rounded-xl px-4 py-3 mb-4'>
                    AI isn&apos;t configured yet. Add <code className='font-mono text-xs'>VITE_OLLAMA_API_KEY</code> to <code className='font-mono text-xs'>.env</code> and restart the dev server to use this.
                </p>
            )}

            {!file ? (
                <button
                    type='button'
                    disabled={busy || !aiReady}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
                    className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        dragging ? 'border-[#6FAE73] bg-[#E6F3E3] dark:bg-[#16241A]' : 'border-[#C9DDC4] dark:border-[#2A352C] bg-white dark:bg-[#14171A] hover:border-[#A9D8AE]'
                    }`}
                >
                    <Upload size={20} className='text-[#6A6F73] dark:text-[#8FA893]' />
                    <span className='text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'>Drop a PDF here or click to browse</span>
                    <span className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>Text-based PDFs up to {MAX_FILE_MB} MB</span>
                </button>
            ) : (
                <div className='flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28]'>
                    <FileText size={18} className='text-[#C4453A] shrink-0' />
                    <span className='flex-1 min-w-0 truncate text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'>{file.name}</span>
                    <span className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    {!busy && (
                        <button type='button' onClick={() => setFile(null)} aria-label='Remove file' className='text-[#6A6F73] hover:text-[#C4453A]'>
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}
            <input ref={inputRef} type='file' accept='application/pdf,.pdf' hidden onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} />

            {file && (
                <div className='mt-4 flex flex-col gap-3'>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        disabled={busy}
                        rows={2}
                        placeholder='Notes for the AI (optional) — e.g. "Beginner level, 5 lessons, include worked examples"'
                        className='w-full rounded-xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A] px-4 py-3 text-sm text-[#1F2225] dark:text-[#F2F5F0] outline-none focus:border-[#A9D8AE] resize-y'
                    />

                    {hasLessons && (
                        <div className='flex flex-wrap items-center gap-4 text-sm text-[#1F2225] dark:text-[#F2F5F0]'>
                            <label className='flex items-center gap-2 cursor-pointer'>
                                <input type='radio' name='pdf-mode' checked={mode === 'append'} onChange={() => setMode('append')} disabled={busy} className='accent-[#6FAE73]' />
                                Add after existing lessons
                            </label>
                            <label className='flex items-center gap-2 cursor-pointer'>
                                <input type='radio' name='pdf-mode' checked={mode === 'replace'} onChange={() => setMode('replace')} disabled={busy} className='accent-[#6FAE73]' />
                                Replace existing lessons
                            </label>
                        </div>
                    )}

                    <div className='flex items-center gap-3'>
                        <button
                            type='button'
                            onClick={handleGenerate}
                            disabled={busy || !aiReady}
                            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C] hover:bg-[#2A2E2B] disabled:opacity-60'
                        >
                            {busy ? <Loader2 size={15} className='animate-spin' /> : <Sparkles size={15} />}
                            {busy ? 'Generating…' : 'Generate lectures'}
                        </button>
                        {busy && (
                            <button type='button' onClick={handleCancel} className='text-sm font-medium text-[#6A6F73] dark:text-[#8FA893] hover:text-[#C4453A]'>
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}

            {progress && <p className='mt-3 text-sm text-[#3E7A42] dark:text-[#8FE0A0]'>{progress}</p>}
            {error && <p className='mt-3 text-sm text-[#C4453A] bg-[#FDEEEE] dark:bg-[#2A1A17] rounded-xl px-4 py-2.5'>{error}</p>}
        </div>
    )
}
