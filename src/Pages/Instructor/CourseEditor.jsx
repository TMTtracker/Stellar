import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
    ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, Code, Eye, EyeOff, FileText,
    Loader2, MessagesSquare, Plus, Save, Sparkles, Trash2, X
} from 'lucide-react'
import InstructorLayout from '@/components/Instructor/InstructorLayout'
import RichTextEditor from '@/components/Instructor/RichTextEditor'
import PdfImportPanel from '@/components/Instructor/PdfImportPanel'
import QuizEditor from '@/components/Instructor/QuizEditor'
import { getCourseForEditing, saveCourse } from '@/services/instructor'
import { quizProblem } from '@/lib/quiz'

const COLORS = ['#A9D8AE', '#B9D1E5', '#E5D1B9', '#D6C3E8', '#E8B9BE', '#EBCF7E', '#9FCFC8']
const ICONS = [
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Code', icon: Code },
    { name: 'MessagesSquare', icon: MessagesSquare }
]
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const REWARDS = { Easy: '40 XP · 15 coins', Medium: '60 XP · 20 coins', Hard: '90 XP · 30 coins' }

const EMPTY_COURSE = { id: null, title: '', subject: '', description: '', color: COLORS[0], icon: 'BookOpen', is_published: false }

const newKey = () => crypto.randomUUID()
const newLesson = (n) => ({ key: newKey(), id: null, title: `Lesson ${n}`, summary: '', difficulty: 'Easy', duration_min: 15, content: '', quiz: null, quizDirty: false })
const withKeys = (lessons) => lessons.map(l => ({ ...l, key: newKey() }))

const inputClass =
    'w-full rounded-xl border border-[#C9DDC4] dark:border-[#262E28] bg-white dark:bg-[#14171A] px-4 py-2.5 text-sm text-[#1F2225] dark:text-[#F2F5F0] outline-none focus:border-[#A9D8AE] focus:ring-4 focus:ring-[#A9D8AE]/20 placeholder:text-[#9AA39C] dark:placeholder:text-[#5C6A5F]'
const labelClass = 'block text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-1.5'

export default function CourseEditor() {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isNew = !courseId

    const [course, setCourse] = useState(EMPTY_COURSE)
    const [lessons, setLessons] = useState(() => (isNew ? [newLesson(1)] : []))
    const [selectedKey, setSelectedKey] = useState(() => null)
    const [loading, setLoading] = useState(!isNew)
    const [loadError, setLoadError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [notice, setNotice] = useState(
        location.state?.saved === 'published' ? 'Course published — students can now enroll.'
            : location.state?.saved ? 'Draft saved.' : ''
    )
    const [dirty, setDirty] = useState(false)
    const [showAi, setShowAi] = useState(isNew)

    const applyLoaded = useCallback((data, keepIndex = 0) => {
        const keyed = withKeys(data.lessons)
        setCourse({
            id: data.course.id,
            title: data.course.title ?? '',
            subject: data.course.subject ?? '',
            description: data.course.description ?? '',
            color: data.course.color ?? COLORS[0],
            icon: data.course.icon ?? 'BookOpen',
            is_published: !!data.course.is_published
        })
        setLessons(keyed)
        setSelectedKey(keyed[Math.min(keepIndex, keyed.length - 1)]?.key ?? null)
        setDirty(false)
    }, [])

    useEffect(() => {
        if (isNew) return
        let cancelled = false
        getCourseForEditing(courseId)
            .then(data => !cancelled && applyLoaded(data))
            .catch(e => !cancelled && setLoadError(e.message ?? 'Failed to load course'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [isNew, courseId, applyLoaded])

    // Warn before closing the tab with unsaved work.
    useEffect(() => {
        if (!dirty) return
        const handler = (e) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    const selectedIndex = useMemo(() => {
        const i = lessons.findIndex(l => l.key === selectedKey)
        return i === -1 ? 0 : i
    }, [lessons, selectedKey])
    const selected = lessons[selectedIndex] ?? null

    function updateCourse(patch) {
        setCourse(c => ({ ...c, ...patch }))
        setDirty(true)
    }

    const updateLesson = useCallback((key, patch) => {
        setLessons(list => list.map(l => (l.key === key ? { ...l, ...patch } : l)))
        setDirty(true)
    }, [])

    const selectedLessonKey = selected?.key
    const handleContentChange = useCallback((html) => {
        if (!selectedLessonKey) return
        // Editing a lecture that has a quiz flags the quiz for review.
        setLessons(list => list.map(l => (l.key === selectedLessonKey ? { ...l, content: html, quizStale: !!l.quiz } : l)))
        setDirty(true)
    }, [selectedLessonKey])

    const handleQuizChange = useCallback((quiz, { fresh = false } = {}) => {
        if (!selectedLessonKey) return
        setLessons(list => list.map(l => (
            l.key === selectedLessonKey ? { ...l, quiz, quizDirty: true, quizStale: fresh || !quiz ? false : l.quizStale } : l
        )))
        setDirty(true)
    }, [selectedLessonKey])

    function addLesson() {
        const lesson = newLesson(lessons.length + 1)
        setLessons(list => [...list, lesson])
        setSelectedKey(lesson.key)
        setDirty(true)
    }

    function removeLesson(key) {
        const idx = lessons.findIndex(l => l.key === key)
        const next = lessons.filter(l => l.key !== key)
        setLessons(next)
        if (key === selected?.key) setSelectedKey(next[Math.max(0, idx - 1)]?.key ?? null)
        setDirty(true)
    }

    function moveLesson(key, dir) {
        setLessons(list => {
            const i = list.findIndex(l => l.key === key)
            const j = i + dir
            if (i < 0 || j < 0 || j >= list.length) return list
            const copy = [...list]
            ;[copy[i], copy[j]] = [copy[j], copy[i]]
            return copy
        })
        setDirty(true)
    }

    function handleGenerated(draft, mode) {
        const generated = withKeys(draft.lessons.map(l => ({ ...l, id: null })))
        setCourse(c => ({
            ...c,
            title: c.title.trim() ? c.title : draft.title,
            subject: c.subject.trim() ? c.subject : draft.subject,
            description: c.description.trim() ? c.description : draft.description
        }))
        // A brand-new course starts with one blank placeholder lesson - drop it.
        const keep = mode === 'append' ? lessons.filter(l => l.id || l.content || l.summary) : []
        setLessons([...keep, ...generated])
        setSelectedKey(generated[0].key)
        setDirty(true)
        setShowAi(false)
        const quizzes = generated.filter(l => l.quiz).length
        setNotice(
            `AI drafted ${generated.length} lecture${generated.length === 1 ? '' : 's'} and ${quizzes} quiz${quizzes === 1 ? '' : 'zes'}. ` +
            (quizzes < generated.length ? `${generated.length - quizzes} lecture${generated.length - quizzes === 1 ? '' : 's'} had no quiz generated — use "Generate quiz" on them. ` : '') +
            'Review and edit everything before publishing.'
        )
    }

    async function handleSave(publish = course.is_published) {
        setSaveError('')
        setNotice('')
        if (!course.title.trim()) {
            setSaveError('Give your course a title before saving.')
            return
        }
        // Quizzes are validated server-side on every save, so check them first.
        for (const l of lessons) {
            const problem = l.quizDirty ? quizProblem(l.quiz) : ''
            if (problem) {
                setSelectedKey(l.key)
                setSaveError(`Quiz for “${l.title || 'Untitled lesson'}”: ${problem}`)
                return
            }
        }
        if (publish) {
            if (lessons.length === 0) {
                setSaveError('Add at least one lecture before publishing.')
                return
            }
            const empty = lessons.find(l => !l.content.trim())
            if (empty) {
                setSelectedKey(empty.key)
                setSaveError(`“${empty.title || 'Untitled lesson'}” has no content yet. Write it or remove it before publishing.`)
                return
            }
        }

        setSaving(true)
        try {
            const id = await saveCourse({ ...course, is_published: publish }, lessons)
            setDirty(false)
            if (isNew) {
                navigate(`/instructor/courses/${id}/edit`, { replace: true, state: { saved: publish ? 'published' : 'draft' } })
                return
            }
            applyLoaded(await getCourseForEditing(id), selectedIndex)
            setNotice(publish ? (course.is_published ? 'Changes saved and live for students.' : 'Course published — students can now enroll.') : 'Draft saved.')
        } catch (e) {
            setSaveError(e.message ?? 'Save failed.')
        } finally {
            setSaving(false)
        }
    }

    const actions = !loading && !loadError && (
        <div className='flex items-center gap-2'>
            {dirty && <span className='hidden md:inline text-xs text-[#6A6F73] dark:text-[#8FA893] mr-1'>Unsaved changes</span>}
            {!isNew && (
                <Link
                    to={`/instructor/courses/${courseId}/preview${selected?.id ? `?lesson=${selected.id}` : ''}`}
                    title={dirty ? 'Preview shows the last saved version — save first to see your changes' : 'Preview as a student'}
                    className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE]'
                >
                    <Eye size={15} /> Preview
                </Link>
            )}
            <button
                onClick={() => handleSave(course.is_published)}
                disabled={saving}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] disabled:opacity-60'
            >
                {saving ? <Loader2 size={15} className='animate-spin' /> : <Save size={15} />}
                {course.is_published ? 'Save changes' : 'Save draft'}
            </button>
            <button
                onClick={() => handleSave(!course.is_published)}
                disabled={saving}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 ${
                    course.is_published ? 'bg-[#F5E9D3] text-[#8A6A2E] hover:bg-[#EFDFC0]' : 'bg-[#141814] text-white hover:bg-[#2A2E2B]'
                }`}
            >
                {course.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                {course.is_published ? 'Unpublish' : 'Publish'}
            </button>
        </div>
    )

    return (
        <InstructorLayout subtitle={isNew ? 'New course' : 'Edit course'} actions={actions}>
            <Link to='/instructor' className='inline-flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] mb-5'>
                <ChevronLeft size={16} /> My courses
            </Link>

            {loading && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading course…</p>}

            {!loading && loadError && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-red-200 dark:border-red-900/50 p-6 text-sm'>
                    <p className='font-bold text-red-600 dark:text-red-400 mb-1'>Couldn&apos;t open this course</p>
                    <p className='text-[#6A6F73] dark:text-[#8FA893]'>{loadError}</p>
                </div>
            )}

            {!loading && !loadError && (
                <div className='flex flex-col gap-5 max-w-[1280px]'>
                    {(saveError || notice) && (
                        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${saveError ? 'bg-[#FDEEEE] text-[#B03A31] dark:bg-[#2A1A17] dark:text-[#E39B8B]' : 'bg-[#E6F3E3] text-[#2F6B33] dark:bg-[#16241A] dark:text-[#8FE0A0]'}`}>
                            {saveError ? <X size={16} className='mt-0.5 shrink-0' /> : <Check size={16} className='mt-0.5 shrink-0' />}
                            <span className='flex-1'>{saveError || notice}</span>
                            <button onClick={() => { setSaveError(''); setNotice('') }} aria-label='Dismiss' className='opacity-60 hover:opacity-100'><X size={14} /></button>
                        </div>
                    )}

                    {/* Course details */}
                    <section className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6'>
                        <div className='flex items-center justify-between mb-5'>
                            <h2 className='text-lg font-bold'>Course details</h2>
                            <span className={`text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full ${
                                course.is_published ? 'bg-[#E1F0DF] text-[#3E7A42] dark:bg-[#1B2B1D] dark:text-[#8FE0A0]' : 'bg-[#F5E9D3] text-[#A07A2E] dark:bg-[#2A2417] dark:text-[#E3BE72]'
                            }`}>
                                {course.is_published ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4'>
                            <div>
                                <label className={labelClass} htmlFor='course-title'>COURSE TITLE</label>
                                <input id='course-title' className={inputClass} value={course.title} onChange={e => updateCourse({ title: e.target.value })} placeholder='e.g. Introduction to Photosynthesis' />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor='course-subject'>SUBJECT</label>
                                <input id='course-subject' className={inputClass} value={course.subject} onChange={e => updateCourse({ subject: e.target.value })} placeholder='e.g. Biology' />
                            </div>
                            <div className='md:col-span-2'>
                                <label className={labelClass} htmlFor='course-description'>DESCRIPTION</label>
                                <textarea id='course-description' rows={3} className={`${inputClass} resize-y`} value={course.description} onChange={e => updateCourse({ description: e.target.value })} placeholder='What will students learn in this course?' />
                            </div>
                            <div className='md:col-span-2 flex flex-wrap items-center gap-8'>
                                <div>
                                    <p className={labelClass}>COLOUR</p>
                                    <div className='flex items-center gap-2'>
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                type='button'
                                                onClick={() => updateCourse({ color: c })}
                                                aria-label={`Colour ${c}`}
                                                aria-pressed={course.color === c}
                                                className={`w-7 h-7 rounded-full transition-transform ${course.color === c ? 'ring-2 ring-offset-2 ring-[#1F2225] dark:ring-[#F2F5F0] dark:ring-offset-[#14171A] scale-110' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className={labelClass}>ICON</p>
                                    <div className='flex items-center gap-2'>
                                        {ICONS.map(({ name, icon: Icon }) => (
                                            <button
                                                key={name}
                                                type='button'
                                                onClick={() => updateCourse({ icon: name })}
                                                aria-label={name}
                                                aria-pressed={course.icon === name}
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${course.icon === name ? 'text-white' : 'text-[#6A6F73] dark:text-[#8FA893] bg-[#EFF3EE] dark:bg-[#1B211C] hover:text-[#1F2225]'}`}
                                                style={course.icon === name ? { backgroundColor: course.color } : undefined}
                                            >
                                                <Icon size={17} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI from PDF */}
                    {showAi ? (
                        <div className='relative'>
                            <PdfImportPanel hasLessons={lessons.some(l => l.id || l.content)} onGenerated={handleGenerated} />
                            {!isNew && (
                                <button onClick={() => setShowAi(false)} aria-label='Hide' className='absolute top-4 right-4 text-[#6A6F73] hover:text-[#1F2225] dark:hover:text-[#F2F5F0]'>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAi(true)}
                            className='self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-[#A9D8AE] text-[#3E7A42] dark:text-[#8FE0A0] hover:bg-[#EFF7EE] dark:hover:bg-[#16241A]'
                        >
                            <Sparkles size={15} /> Generate lectures from a PDF
                        </button>
                    )}

                    {/* Lectures */}
                    <section className='grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start'>
                        <aside className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-3 lg:sticky lg:top-0'>
                            <div className='flex items-center justify-between px-2 pt-1 pb-3'>
                                <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893]'>LECTURES ({lessons.length})</p>
                            </div>
                            <ol className='flex flex-col gap-1'>
                                {lessons.map((l, i) => {
                                    const active = l.key === selected?.key
                                    return (
                                        <li key={l.key} className={`group flex items-center gap-2 rounded-xl pl-2 pr-1 py-1.5 ${active ? 'bg-[#DCEFD6] dark:bg-[#1E2B20]' : 'hover:bg-[#F2F7F1] dark:hover:bg-[#1A1F1B]'}`}>
                                            <button onClick={() => setSelectedKey(l.key)} className='flex-1 min-w-0 flex items-center gap-2 text-left'>
                                                <span className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${active ? 'bg-[#141814] text-white' : 'bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893]'}`}>{i + 1}</span>
                                                <span className='min-w-0'>
                                                    <span className='block truncate text-sm font-medium'>{l.title || 'Untitled lesson'}</span>
                                                    <span className='block text-[11px] text-[#6A6F73] dark:text-[#8FA893]'>
                                                        {l.difficulty} · {l.duration_min} min{!l.content && <span className='text-[#C79A3E]'> · empty</span>}
                                                        {l.quiz && <span className={l.quizStale ? 'text-[#C79A3E]' : 'text-[#3E7A42] dark:text-[#8FE0A0]'}> · quiz</span>}
                                                    </span>
                                                </span>
                                            </button>
                                            <span className='flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100'>
                                                <button onClick={() => moveLesson(l.key, -1)} disabled={i === 0} aria-label='Move up' className='w-6 h-6 rounded flex items-center justify-center text-[#6A6F73] hover:text-[#1F2225] dark:hover:text-white disabled:opacity-30'><ArrowUp size={13} /></button>
                                                <button onClick={() => moveLesson(l.key, 1)} disabled={i === lessons.length - 1} aria-label='Move down' className='w-6 h-6 rounded flex items-center justify-center text-[#6A6F73] hover:text-[#1F2225] dark:hover:text-white disabled:opacity-30'><ArrowDown size={13} /></button>
                                                <button onClick={() => removeLesson(l.key)} aria-label='Delete lesson' className='w-6 h-6 rounded flex items-center justify-center text-[#6A6F73] hover:text-[#C4453A]'><Trash2 size={13} /></button>
                                            </span>
                                        </li>
                                    )
                                })}
                            </ol>
                            <button onClick={addLesson} className='mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-dashed border-[#C9DDC4] dark:border-[#2A352C] text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE] hover:text-[#1F2225] dark:hover:text-[#F2F5F0]'>
                                <Plus size={15} /> Add lecture
                            </button>
                        </aside>

                        {selected ? (
                            <div className='flex flex-col gap-4 min-w-0'>
                                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-5 grid grid-cols-1 md:grid-cols-[1fr_150px_120px] gap-4'>
                                    <div>
                                        <label className={labelClass} htmlFor='lesson-title'>LECTURE {selectedIndex + 1} TITLE</label>
                                        <input id='lesson-title' className={inputClass} value={selected.title} onChange={e => updateLesson(selected.key, { title: e.target.value })} placeholder='Lecture title' />
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor='lesson-difficulty'>DIFFICULTY</label>
                                        <select id='lesson-difficulty' className={inputClass} value={selected.difficulty} onChange={e => updateLesson(selected.key, { difficulty: e.target.value })}>
                                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass} htmlFor='lesson-duration'>MINUTES</label>
                                        <input id='lesson-duration' type='number' min={1} max={240} className={inputClass} value={selected.duration_min} onChange={e => updateLesson(selected.key, { duration_min: e.target.value })} />
                                    </div>
                                    <div className='md:col-span-3'>
                                        <label className={labelClass} htmlFor='lesson-summary'>SHORT SUMMARY</label>
                                        <input id='lesson-summary' className={inputClass} value={selected.summary} onChange={e => updateLesson(selected.key, { summary: e.target.value })} placeholder='One sentence students see before opening the lecture' />
                                        <p className='text-[11px] text-[#6A6F73] dark:text-[#8FA893] mt-1.5'>Students earn {REWARDS[selected.difficulty]} for completing a {selected.difficulty.toLowerCase()} lecture.</p>
                                    </div>
                                </div>

                                <RichTextEditor key={selected.key} value={selected.content} onChange={handleContentChange} />

                                <QuizEditor
                                    key={`quiz-${selected.key}`}
                                    lessonTitle={selected.title}
                                    lessonHtml={selected.content}
                                    quiz={selected.quiz}
                                    stale={!!selected.quizStale}
                                    onChange={handleQuizChange}
                                />
                            </div>
                        ) : (
                            <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-12 text-center'>
                                <FileText size={22} className='mx-auto text-[#6A6F73] dark:text-[#8FA893] mb-3' />
                                <p className='font-bold'>No lectures yet</p>
                                <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-4'>Add a lecture to start writing, or generate them from a PDF.</p>
                                <button onClick={addLesson} className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#141814] text-white'>
                                    <Plus size={15} /> Add lecture
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </InstructorLayout>
    )
}
