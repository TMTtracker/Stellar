import { useEffect, useMemo, useState } from 'react'
import {
    ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, Clock, Coins,
    ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Lock, Play, Sparkles, Video, Zap
} from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import QuizTaker from '@/components/Quiz/QuizTaker'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getLessonDetail } from '@/services/lessons'
import { getQuizForLesson } from '@/services/quizzes'
import { completeLesson, enrollInCourse, getCourseProgress, getEnrollment, uncompleteLesson } from '@/services/courses'
import { materialIconFor } from '@/lib/materials'
import { htmlToText } from '@/lib/lessonContent'
import LessonContent from '@/components/Lesson/LessonContent'
import { getFallbackCourse, isFallbackCourseId } from '@/data/fallbackCourses'

const difficultyColor = {
    Easy: 'text-[#6FAE73] bg-[#E1F0DF] dark:bg-[#1B2B1D] dark:text-[#8FE0A0]',
    Medium: 'text-[#C79A3E] bg-[#F5E9D3] dark:bg-[#2A2417] dark:text-[#E3BE72]',
    Hard: 'text-[#C4634F] bg-[#F5DED9] dark:bg-[#2A1A17] dark:text-[#E39B8B]'
}

const resourceIcon = {
    link: LinkIcon,
    video: Video,
    image: ImageIcon,
    file: FileText
}

export default function LessonShow() {
    const { courseId, lessonId } = useParams()
    const navigate = useNavigate()
    const [lesson, setLesson] = useState(null)
    const [course, setCourse] = useState(null)
    const [siblings, setSiblings] = useState([])
    const [prev, setPrev] = useState(null)
    const [next, setNext] = useState(null)
    const [resources, setResources] = useState([])
    const [quiz, setQuiz] = useState(null)
    const [completedIds, setCompletedIds] = useState(new Set())
    const [enrolled, setEnrolled] = useState(false)
    const [enrolling, setEnrolling] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [completing, setCompleting] = useState(false)

    useEffect(() => {
        let cancelled = false
        // Static fallback so lessons under the Project Management /
        // Computer Architecture / Theory of Computation cards work like
        // other courses even before supabase/seed.sql has been run.
        if (isFallbackCourseId(courseId)) {
            const fallback = getFallbackCourse(courseId)
            const ordered = [...fallback.lessons].sort((a, b) => a.position - b.position)
            const current = ordered.find(l => l.id === lessonId)
            if (!current) {
                setError('This lesson does not belong to this course.')
                setLoading(false)
                return undefined
            }
            const idx = ordered.findIndex(l => l.id === lessonId)
            const siblingList = ordered.map(({ id, title, position, duration_min, difficulty }) => ({ id, title, position, duration_min, difficulty }))
            if (!cancelled) {
                setLesson({ ...current, content_format: 'text' })
                setCourse(fallback.course)
                setSiblings(siblingList)
                setPrev(idx > 0 ? siblingList[idx - 1] : null)
                setNext(idx >= 0 && idx < siblingList.length - 1 ? siblingList[idx + 1] : null)
                setResources([])
                setQuiz(null)
                setLoading(false)
            }
            return undefined
        }
        Promise.all([
            getLessonDetail(lessonId),
            getCourseProgress(courseId),
            getQuizForLesson(lessonId),
            getEnrollment(courseId)
        ])
            .then(([detail, progress, quizData, enrollment]) => {
                if (cancelled) return
                // Guard against a mismatched URL (lesson from another course)
                if (detail.lesson.course_id !== courseId) {
                    throw new Error('This lesson does not belong to this course.')
                }
                setLesson(detail.lesson)
                setCourse(detail.course)
                setSiblings(detail.siblings)
                setPrev(detail.prev)
                setNext(detail.next)
                setResources(detail.resources)
                setQuiz(quizData)
                setCompletedIds(new Set((progress ?? []).map(p => p.lesson_id)))
                setEnrolled(!!enrollment)
            })
            .catch(e => {
                if (!cancelled) setError(e.message ?? 'Failed to load lesson')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [courseId, lessonId])

    const status = useMemo(() => {
        if (!lesson) return null
        if (completedIds.has(lesson.id)) return 'completed'
        const firstIncomplete = siblings.find(s => !completedIds.has(s.id))
        if (firstIncomplete && firstIncomplete.id === lesson.id) return 'current'
        return 'locked'
    }, [lesson, siblings, completedIds])

    const isCompleted = status === 'completed'
    const isLocked = status === 'locked' || !enrolled

    async function handleEnroll() {
        if (isFallbackCourseId(courseId)) {
            setEnrolled(true)
            return
        }
        setEnrolling(true)
        try {
            await enrollInCourse(courseId)
            setEnrolled(true)
        } catch (e) {
            setError(e.message)
        } finally {
            setEnrolling(false)
        }
    }

    function handleSummarize() {
        if (!lesson) return
        navigate('/ai', {
            state: {
                lesson: {
                    id: lesson.id,
                    courseId,
                    courseTitle: course?.title ?? '',
                    title: lesson.title,
                    summary: lesson.summary ?? '',
                    content: lesson.content_format === 'html' ? htmlToText(lesson.content) : (lesson.content ?? '')
                }
            }
        })
    }

    async function handleToggleComplete() {
        if (isFallbackCourseId(courseId)) {
            setCompletedIds(prevSet => {
                const nextSet = new Set(prevSet)
                if (nextSet.has(lesson.id)) nextSet.delete(lesson.id)
                else nextSet.add(lesson.id)
                return nextSet
            })
            return
        }
        setCompleting(true)
        try {
            if (isCompleted) {
                await uncompleteLesson(lesson.id)
                setCompletedIds(prevSet => {
                    const nextSet = new Set(prevSet)
                    nextSet.delete(lesson.id)
                    return nextSet
                })
            } else {
                await completeLesson({ lessonId: lesson.id, courseId })
                setCompletedIds(prevSet => new Set(prevSet).add(lesson.id))
            }
        } catch (e) {
            setError(e.message)
        } finally {
            setCompleting(false)
        }
    }

    function handleQuizPassed() {
        setCompletedIds(prevSet => new Set(prevSet).add(lessonId))
    }

    return (
        <ProtectedLayout>
            <Link to={`/courses/${courseId}`} className='flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] dark:text-[#8FA893] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] mb-6'>
                <ChevronLeft size={16} /> Back to {course?.title ?? 'course'}
            </Link>

            {loading && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading lesson…</p>}

            {!loading && error && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-red-200 dark:border-red-900/50 p-6 text-sm mb-6'>
                    <p className='font-bold text-red-600 dark:text-red-400 mb-1'>Couldn&apos;t load lesson</p>
                    <p className='text-[#6A6F73] dark:text-[#8FA893]'>{error}</p>
                </div>
            )}

            {!loading && !error && lesson && !enrolled && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-10 text-center max-w-xl mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-[#EFF7EE] dark:bg-[#16241A] flex items-center justify-center mx-auto mb-4'>
                        <Lock size={20} className='text-[#3E7A42] dark:text-[#8FE0A0]' />
                    </div>
                    <p className='font-bold text-lg text-[#1F2225] dark:text-[#F2F5F0]'>Enroll to start this lesson</p>
                    <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-5'>You need to enroll in “{course?.title ?? 'this course'}” before you can read “{lesson.title}”, take its quiz, or earn rewards.</p>
                    <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-60'
                    >
                        <Play size={15} /> {enrolling ? 'Enrolling…' : 'Enroll in course'}
                    </button>
                </div>
            )}

            {!loading && !error && lesson && enrolled && isLocked && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-10 text-center max-w-xl mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-[#EFF3EE] dark:bg-[#1B211C] flex items-center justify-center mx-auto mb-4'>
                        <Lock size={20} className='text-[#6A6F73] dark:text-[#8FA893]' />
                    </div>
                    <p className='font-bold text-lg text-[#1F2225] dark:text-[#F2F5F0]'>Lesson locked</p>
                    <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-5'>Complete the previous lessons in this course to unlock “{lesson.title}”.</p>
                    <Link to={`/courses/${courseId}`} className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#DCEFD6] dark:bg-[#1E2B20] dark:text-[#F2F5F0] hover:bg-[#D2E8CC] dark:hover:bg-[#243328]'>
                        <BookOpen size={15} /> Back to course
                    </Link>
                </div>
            )}

            {!loading && !error && lesson && enrolled && !isLocked && (
                <>
                    {/* Header */}
                    <div className='mb-6'>
                        <div className='flex items-center gap-2 mb-2'>
                            <span className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>
                                LESSON {siblings.findIndex(s => s.id === lesson.id) + 1} OF {siblings.length}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyColor[lesson.difficulty] ?? difficultyColor.Easy}`}>
                                {lesson.difficulty}
                            </span>
                            {isCompleted && (
                                <span className='flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E1F0DF] dark:bg-[#1B2B1D] text-[#3E7A42] dark:text-[#8FE0A0]'>
                                    <Check size={11} strokeWidth={3} /> Completed
                                </span>
                            )}
                        </div>
                        <h1 className='text-3xl font-extrabold tracking-tight text-[#1F2225] dark:text-[#F2F5F0]'>{lesson.title}</h1>
                        {lesson.summary && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-2 max-w-2xl'>{lesson.summary}</p>}

                        <div className='flex flex-wrap items-center gap-4 mt-3 text-xs text-[#6A6F73] dark:text-[#8FA893]'>
                            <span className='flex items-center gap-1'><Clock size={13} /> {lesson.duration_min} min</span>
                            <span className='flex items-center gap-1'><Zap size={13} className='text-[#C79A3E]' /> {lesson.xp_reward} XP</span>
                            <span className='flex items-center gap-1'><Coins size={13} className='text-[#C79A3E]' /> {lesson.coins_reward} coins</span>
                            {lesson.material_qty > 0 && (() => {
                                const MaterialIcon = materialIconFor(lesson.material_name)
                                return (
                                    <span className='flex items-center gap-1'>
                                        <MaterialIcon size={13} /> {lesson.material_qty} {lesson.material_name}
                                    </span>
                                )
                            })()}
                        </div>

                        <button
                            onClick={handleSummarize}
                            className='mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#141814] dark:bg-[#1B211C] text-white hover:bg-[#2A2E2B] dark:hover:bg-[#232A24] transition-colors'
                        >
                            <Sparkles size={15} /> Summarize with AI
                        </button>
                    </div>

                    {/* Content */}
                    <article className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6 sm:p-8 mb-5'>
                        <LessonContent lesson={lesson} />
                    </article>

                    {/* Resources */}
                    {resources.length > 0 && (
                        <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-6 mb-5'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] dark:text-[#8FA893] mb-3'>FURTHER READING</p>
                            <div className='flex flex-col gap-2'>
                                {resources.map(r => {
                                    const Icon = resourceIcon[r.kind] ?? LinkIcon
                                    return (
                                        <a
                                            key={r.id}
                                            href={r.url}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='flex items-center gap-3 px-4 py-3 rounded-xl border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'
                                        >
                                            <span className='w-8 h-8 rounded-lg bg-[#EFF3EE] dark:bg-[#1B211C] flex items-center justify-center shrink-0'>
                                                <Icon size={15} className='text-[#6A6F73] dark:text-[#8FA893]' />
                                            </span>
                                            <span className='flex-1 truncate'>{r.title}</span>
                                            <span className='text-[10px] uppercase text-[#6A6F73] dark:text-[#8FA893] bg-[#EFF3EE] dark:bg-[#1B211C] px-2 py-0.5 rounded-full'>{r.kind}</span>
                                            <ExternalLink size={14} className='text-[#6A6F73] dark:text-[#8FA893] shrink-0' />
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quiz */}
                    <div className='rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] bg-[#FAFCF9] dark:bg-[#14171A] p-6 sm:p-8 mb-5'>
                        <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE] mb-1'>CHECK YOUR UNDERSTANDING</p>
                        <h2 className='text-lg font-bold mb-4 text-[#1F2225] dark:text-[#F2F5F0]'>{quiz ? quiz.title : 'Quiz'}</h2>
                        {quiz
                            ? (
                                <QuizTaker
                                    key={quiz.id}
                                    quiz={quiz}
                                    onPassed={handleQuizPassed}
                                    xpReward={lesson.xp_reward}
                                    coinsReward={lesson.coins_reward}
                                    materialName={lesson.material_name}
                                    materialQty={lesson.material_qty}
                                />
                            )
                            : <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>No quiz for this lesson yet — just mark it complete when you&apos;ve finished reading.</p>}
                    </div>

                    {/* Footer actions: prev / complete / next */}
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4'>
                        {prev ? (
                            <Link
                                to={`/courses/${courseId}/lessons/${prev.id}`}
                                className='flex-1 flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'
                            >
                                <ArrowLeft size={15} />
                                <span className='truncate'>{prev.title}</span>
                            </Link>
                        ) : <div className='flex-1 hidden sm:block' />}

                        <button
                            onClick={handleToggleComplete}
                            disabled={completing}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 ${
                                isCompleted ? 'bg-[#DCEFD6] dark:bg-[#1E2B20] hover:bg-[#D2E8CC] dark:hover:bg-[#243328] text-[#1F2225] dark:text-[#F2F5F0]' : 'bg-[#A9D8AE] text-white hover:bg-[#96CC9C]'
                            }`}
                        >
                            {completing ? '…' : isCompleted ? (<><Check size={15} /> Completed — undo</>) : (<><Play size={15} /> Mark as complete</>)}
                        </button>

                        {next ? (
                            <Link
                                to={`/courses/${courseId}/lessons/${next.id}`}
                                className='flex-1 flex items-center justify-end gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] hover:border-[#A9D8AE] text-sm font-medium text-[#1F2225] dark:text-[#F2F5F0]'
                            >
                                <span className='truncate'>{next.title}</span>
                                <ArrowRight size={15} />
                            </Link>
                        ) : <div className='flex-1 hidden sm:block' />}
                    </div>
                </>
            )}
        </ProtectedLayout>
    )
}
