import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Clock, Coins, Eye, ListChecks, Pencil, Zap } from 'lucide-react'
import InstructorLayout from '@/components/Instructor/InstructorLayout'
import LessonContent from '@/components/Lesson/LessonContent'
import QuizTaker from '@/components/Quiz/QuizTaker'
import { getCoursePreview } from '@/services/instructor'
import { getQuizForLesson } from '@/services/quizzes'
import { materialIconFor } from '@/lib/materials'

const difficultyColor = {
    Easy: 'text-[#6FAE73] bg-[#E1F0DF] dark:bg-[#1B2B1D] dark:text-[#8FE0A0]',
    Medium: 'text-[#C79A3E] bg-[#F5E9D3] dark:bg-[#2A2417] dark:text-[#E3BE72]',
    Hard: 'text-[#C4634F] bg-[#F5DED9] dark:bg-[#2A1A17] dark:text-[#E39B8B]'
}

/**
 * Instructor-only "view as student": every lecture unlocked, rendered with
 * the same components students see, and quizzes playable in preview mode
 * (graded locally - no attempts, progress or rewards are saved).
 */
export default function CoursePreview() {
    const { courseId } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const [course, setCourse] = useState(null)
    const [lessons, setLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    // { lessonId, quiz } so a quiz from the previous lesson never shows
    const [quizState, setQuizState] = useState({ lessonId: null, quiz: null, error: '' })

    useEffect(() => {
        let cancelled = false
        getCoursePreview(courseId)
            .then(data => {
                if (cancelled) return
                setCourse(data.course)
                setLessons(data.lessons)
            })
            .catch(e => !cancelled && setError(e.message ?? 'Failed to load course'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [courseId])

    const requestedId = searchParams.get('lesson')
    const index = Math.max(0, lessons.findIndex(l => l.id === requestedId))
    const lesson = lessons[index] ?? null
    const prev = index > 0 ? lessons[index - 1] : null
    const next = index < lessons.length - 1 ? lessons[index + 1] : null

    const lessonId = lesson?.id
    useEffect(() => {
        if (!lessonId) return
        let cancelled = false
        getQuizForLesson(lessonId)
            .then(quiz => !cancelled && setQuizState({ lessonId, quiz, error: '' }))
            .catch(e => !cancelled && setQuizState({ lessonId, quiz: null, error: e.message ?? 'Failed to load quiz' }))
        return () => {
            cancelled = true
        }
    }, [lessonId])
    const quizReady = quizState.lessonId === lessonId

    function openLesson(id) {
        setSearchParams({ lesson: id }, { replace: true })
        document.querySelector('main')?.scrollTo({ top: 0 })
    }

    const actions = (
        <Link to={`/instructor/courses/${courseId}/edit`} className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#141814] text-white hover:bg-[#2A2E2B]'>
            <Pencil size={15} /> Edit course
        </Link>
    )

    return (
        <InstructorLayout subtitle='Student preview' actions={actions}>
            <Link to='/instructor' className='inline-flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] mb-5'>
                <ChevronLeft size={16} /> My courses
            </Link>

            {loading && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading preview…</p>}

            {!loading && error && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-red-200 dark:border-red-900/50 p-6 text-sm'>
                    <p className='font-bold text-red-600 dark:text-red-400 mb-1'>Couldn&apos;t open the preview</p>
                    <p className='text-[#6A6F73] dark:text-[#8FA893]'>{error}</p>
                </div>
            )}

            {!loading && !error && course && (
                <div className='max-w-[1280px] flex flex-col gap-5'>
                    <div className='flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm bg-[#141814] text-[#E8F0E6]'>
                        <Eye size={16} className='text-[#A9D8AE] shrink-0' />
                        <span className='flex-1'>
                            You&apos;re seeing this course the way students do. All lectures are unlocked here, and quiz answers are checked but <strong>not saved</strong>.
                        </span>
                        {!course.is_published && <span className='text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#F5E9D3] text-[#8A6A2E]'>DRAFT — NOT VISIBLE TO STUDENTS YET</span>}
                    </div>

                    {/* Course header, as on the student course page */}
                    <div className='flex items-start gap-4'>
                        <div className='w-12 h-12 rounded-xl flex items-center justify-center shrink-0' style={{ backgroundColor: course.color ?? '#A9D8AE' }}>
                            <BookOpen size={20} className='text-white' />
                        </div>
                        <div>
                            <p className='text-xs font-medium text-[#6A6F73] dark:text-[#8FA893]'>{course.subject}</p>
                            <h1 className='text-2xl font-extrabold tracking-tight'>{course.title}</h1>
                            {course.description && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1 max-w-3xl'>{course.description}</p>}
                        </div>
                    </div>

                    {lessons.length === 0 ? (
                        <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-10 text-center'>
                            <p className='font-bold'>This course has no lectures yet</p>
                            <Link to={`/instructor/courses/${courseId}/edit`} className='text-sm font-medium text-[#3E7A42] dark:text-[#8FE0A0] underline underline-offset-2'>Add one in the editor</Link>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start'>
                            {/* Outline */}
                            <aside className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-3 lg:sticky lg:top-0'>
                                <p className='px-2 pt-1 pb-3 text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893]'>LECTURES ({lessons.length})</p>
                                <ol className='flex flex-col gap-1'>
                                    {lessons.map((l, i) => {
                                        const active = l.id === lesson?.id
                                        return (
                                            <li key={l.id}>
                                                <button
                                                    onClick={() => openLesson(l.id)}
                                                    className={`w-full flex items-center gap-2 text-left rounded-xl px-2 py-2 ${active ? 'bg-[#DCEFD6] dark:bg-[#1E2B20]' : 'hover:bg-[#F2F7F1] dark:hover:bg-[#1A1F1B]'}`}
                                                >
                                                    <span className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${active ? 'bg-[#141814] text-white' : 'bg-[#EFF3EE] dark:bg-[#1B211C] text-[#6A6F73] dark:text-[#8FA893]'}`}>{i + 1}</span>
                                                    <span className='min-w-0'>
                                                        <span className='block truncate text-sm font-medium'>{l.title}</span>
                                                        <span className='block text-[11px] text-[#6A6F73] dark:text-[#8FA893]'>{l.difficulty} · {l.duration_min} min</span>
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ol>
                            </aside>

                            {/* Lesson, mirroring src/Pages/Lessons/show.jsx */}
                            {lesson && (
                                <div className='min-w-0'>
                                    <div className='mb-6'>
                                        <div className='flex items-center gap-2 mb-2'>
                                            <span className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>LESSON {index + 1} OF {lessons.length}</span>
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyColor[lesson.difficulty] ?? difficultyColor.Easy}`}>{lesson.difficulty}</span>
                                        </div>
                                        <h2 className='text-3xl font-extrabold tracking-tight text-[#1F2225] dark:text-[#F2F5F0]'>{lesson.title}</h2>
                                        {lesson.summary && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-2 max-w-2xl'>{lesson.summary}</p>}
                                        <div className='flex flex-wrap items-center gap-4 mt-3 text-xs text-[#6A6F73] dark:text-[#8FA893]'>
                                            <span className='flex items-center gap-1'><Clock size={13} /> {lesson.duration_min} min</span>
                                            <span className='flex items-center gap-1'><Zap size={13} className='text-[#C79A3E]' /> {lesson.xp_reward} XP</span>
                                            <span className='flex items-center gap-1'><Coins size={13} className='text-[#C79A3E]' /> {lesson.coins_reward} coins</span>
                                            {lesson.material_qty > 0 && (() => {
                                                const MaterialIcon = materialIconFor(lesson.material_name)
                                                return <span className='flex items-center gap-1'><MaterialIcon size={13} /> {lesson.material_qty} {lesson.material_name}</span>
                                            })()}
                                        </div>
                                    </div>

                                    <article className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6 sm:p-8 mb-5'>
                                        <LessonContent lesson={lesson} />
                                    </article>

                                    <div className='rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] bg-[#FAFCF9] dark:bg-[#14171A] p-6 sm:p-8 mb-5'>
                                        <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE] mb-1'>CHECK YOUR UNDERSTANDING</p>
                                        <h2 className='text-lg font-bold mb-4 text-[#1F2225] dark:text-[#F2F5F0]'>{quizReady && quizState.quiz ? quizState.quiz.title : 'Quiz'}</h2>
                                        {!quizReady && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading quiz…</p>}
                                        {quizReady && quizState.error && <p className='text-sm text-red-600 dark:text-red-400'>{quizState.error}</p>}
                                        {quizReady && !quizState.error && (quizState.quiz ? (
                                            <QuizTaker
                                                key={quizState.quiz.id}
                                                quiz={quizState.quiz}
                                                preview
                                                xpReward={lesson.xp_reward}
                                                coinsReward={lesson.coins_reward}
                                                materialName={lesson.material_name}
                                                materialQty={lesson.material_qty}
                                            />
                                        ) : (
                                            <div className='flex flex-wrap items-center gap-3'>
                                                <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>No quiz for this lesson yet — students just mark it complete when they&apos;ve finished reading.</p>
                                                <Link to={`/instructor/courses/${courseId}/edit`} className='inline-flex items-center gap-1.5 text-sm font-medium text-[#3E7A42] dark:text-[#8FE0A0]'>
                                                    <ListChecks size={14} /> Add a quiz
                                                </Link>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
                                        {prev ? (
                                            <button onClick={() => openLesson(prev.id)} className='flex-1 flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] text-sm font-medium'>
                                                <ArrowLeft size={15} /> <span className='truncate'>{prev.title}</span>
                                            </button>
                                        ) : <div className='flex-1 hidden sm:block' />}
                                        {next ? (
                                            <button onClick={() => openLesson(next.id)} className='flex-1 flex items-center justify-end gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] text-sm font-medium'>
                                                <span className='truncate'>{next.title}</span> <ArrowRight size={15} />
                                            </button>
                                        ) : <div className='flex-1 hidden sm:block' />}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </InstructorLayout>
    )
}
