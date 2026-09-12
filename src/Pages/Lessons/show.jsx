import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
    ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, Clock, Coins,
    ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Lock, Play, Video, Zap
} from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import QuizTaker from '@/components/Quiz/QuizTaker'
import { Link, useParams } from 'react-router-dom'
import { getLessonDetail } from '@/services/lessons'
import { getQuizForLesson } from '@/services/quizzes'
import { completeLesson, enrollInCourse, getCourseProgress, getEnrollment, uncompleteLesson } from '@/services/courses'

const difficultyColor = {
    Easy: 'text-[#6FAE73] bg-[#E1F0DF]',
    Medium: 'text-[#C79A3E] bg-[#F5E9D3]',
    Hard: 'text-[#C4634F] bg-[#F5DED9]'
}

const resourceIcon = {
    link: LinkIcon,
    video: Video,
    image: ImageIcon,
    file: FileText
}

// Markdown → styled elements matching the app's look
const mdComponents = {
    h1: ({ children }) => <h1 className='text-2xl font-extrabold tracking-tight mt-2 mb-3'>{children}</h1>,
    h2: ({ children }) => <h2 className='text-xl font-extrabold tracking-tight mt-7 mb-3'>{children}</h2>,
    h3: ({ children }) => <h3 className='text-base font-bold mt-6 mb-2'>{children}</h3>,
    p: ({ children }) => <p className='text-[15px] leading-relaxed text-[#2A2E2B] my-3'>{children}</p>,
    ul: ({ children }) => <ul className='my-3 ml-1 flex flex-col gap-1.5'>{children}</ul>,
    ol: ({ children }) => <ol className='my-3 ml-5 list-decimal flex flex-col gap-1.5 text-[15px]'>{children}</ol>,
    li: ({ children }) => (
        <li className='text-[15px] leading-relaxed text-[#2A2E2B] flex gap-2'>
            <span className='text-[#A9D8AE] font-bold shrink-0'>•</span>
            <span>{children}</span>
        </li>
    ),
    blockquote: ({ children }) => (
        <blockquote className='my-4 border-l-4 border-[#A9D8AE] bg-[#EFF7EE] rounded-r-xl px-4 py-3 text-[15px] leading-relaxed'>{children}</blockquote>
    ),
    code: ({ children }) => <code className='bg-[#EFF3EE] px-1.5 py-0.5 rounded-md text-[13px] font-mono'>{children}</code>,
    pre: ({ children }) => <pre className='bg-[#1F2225] text-[#E8F0E6] rounded-xl p-4 my-4 overflow-x-auto text-[13px] leading-relaxed'>{children}</pre>,
    table: ({ children }) => (
        <div className='my-4 overflow-x-auto rounded-xl border border-[#C9DDC4]'>
            <table className='w-full text-sm'>{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className='bg-[#EFF7EE]'>{children}</thead>,
    th: ({ children }) => <th className='text-left font-bold px-4 py-2.5 text-[13px]'>{children}</th>,
    td: ({ children }) => <td className='px-4 py-2.5 text-[14px] border-t border-[#E4ECE2]'>{children}</td>,
    a: ({ href, children }) => (
        <a href={href} target='_blank' rel='noreferrer' className='text-[#3E7A42] font-medium underline underline-offset-2'>{children}</a>
    ),
    strong: ({ children }) => <strong className='font-bold'>{children}</strong>,
    hr: () => <hr className='my-6 border-[#C9DDC4]' />
}

export default function LessonShow() {
    const { courseId, lessonId } = useParams()
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

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [detail, progress, quizData, enrollment] = await Promise.all([
                getLessonDetail(lessonId),
                getCourseProgress(courseId),
                getQuizForLesson(lessonId),
                getEnrollment(courseId)
            ])
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
        } catch (e) {
            setError(e.message ?? 'Failed to load lesson')
        } finally {
            setLoading(false)
        }
    }, [courseId, lessonId])

    useEffect(() => {
        load()
    }, [load])

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

    async function handleToggleComplete() {
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
            <Link to={`/courses/${courseId}`} className='flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] hover:text-[#1F2225] mb-6'>
                <ChevronLeft size={16} /> Back to {course?.title ?? 'course'}
            </Link>

            {loading && <p className='text-sm text-[#6A6F73]'>Loading lesson…</p>}

            {!loading && error && (
                <div className='bg-white rounded-2xl border border-red-200 p-6 text-sm mb-6'>
                    <p className='font-bold text-red-600 mb-1'>Couldn&apos;t load lesson</p>
                    <p className='text-[#6A6F73]'>{error}</p>
                </div>
            )}

            {!loading && !error && lesson && !enrolled && (
                <div className='bg-white rounded-2xl border border-[#C9DDC4] p-10 text-center max-w-xl mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-[#EFF7EE] flex items-center justify-center mx-auto mb-4'>
                        <Lock size={20} className='text-[#3E7A42]' />
                    </div>
                    <p className='font-bold text-lg'>Enroll to start this lesson</p>
                    <p className='text-sm text-[#6A6F73] mt-1 mb-5'>You need to enroll in “{course?.title ?? 'this course'}” before you can read “{lesson.title}”, take its quiz, or earn rewards.</p>
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
                <div className='bg-white rounded-2xl border border-[#C9DDC4] p-10 text-center max-w-xl mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-[#EFF3EE] flex items-center justify-center mx-auto mb-4'>
                        <Lock size={20} className='text-[#6A6F73]' />
                    </div>
                    <p className='font-bold text-lg'>Lesson locked</p>
                    <p className='text-sm text-[#6A6F73] mt-1 mb-5'>Complete the previous lessons in this course to unlock “{lesson.title}”.</p>
                    <Link to={`/courses/${courseId}`} className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#DCEFD6] hover:bg-[#D2E8CC]'>
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
                                <span className='flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E1F0DF] text-[#3E7A42]'>
                                    <Check size={11} strokeWidth={3} /> Completed
                                </span>
                            )}
                        </div>
                        <h1 className='text-3xl font-extrabold tracking-tight'>{lesson.title}</h1>
                        {lesson.summary && <p className='text-sm text-[#6A6F73] mt-2 max-w-2xl'>{lesson.summary}</p>}

                        <div className='flex flex-wrap items-center gap-4 mt-3 text-xs text-[#6A6F73]'>
                            <span className='flex items-center gap-1'><Clock size={13} /> {lesson.duration_min} min</span>
                            <span className='flex items-center gap-1'><Zap size={13} className='text-[#C79A3E]' /> {lesson.xp_reward} XP</span>
                            <span className='flex items-center gap-1'><Coins size={13} className='text-[#C79A3E]' /> {lesson.coins_reward} coins</span>
                        </div>
                    </div>

                    {/* Content */}
                    <article className='bg-white rounded-2xl border border-[#C9DDC4] p-6 sm:p-8 mb-5'>
                        {lesson.content
                            ? <ReactMarkdown components={mdComponents}>{lesson.content}</ReactMarkdown>
                            : <p className='text-sm text-[#6A6F73]'>Content for this lesson is coming soon.</p>}
                    </article>

                    {/* Resources */}
                    {resources.length > 0 && (
                        <div className='bg-white rounded-2xl border border-[#C9DDC4] p-6 mb-5'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73] mb-3'>FURTHER READING</p>
                            <div className='flex flex-col gap-2'>
                                {resources.map(r => {
                                    const Icon = resourceIcon[r.kind] ?? LinkIcon
                                    return (
                                        <a
                                            key={r.id}
                                            href={r.url}
                                            target='_blank'
                                            rel='noreferrer'
                                            className='flex items-center gap-3 px-4 py-3 rounded-xl border border-[#C9DDC4] hover:border-[#A9D8AE] text-sm font-medium'
                                        >
                                            <span className='w-8 h-8 rounded-lg bg-[#EFF3EE] flex items-center justify-center shrink-0'>
                                                <Icon size={15} className='text-[#6A6F73]' />
                                            </span>
                                            <span className='flex-1 truncate'>{r.title}</span>
                                            <span className='text-[10px] uppercase text-[#6A6F73] bg-[#EFF3EE] px-2 py-0.5 rounded-full'>{r.kind}</span>
                                            <ExternalLink size={14} className='text-[#6A6F73] shrink-0' />
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quiz */}
                    <div className='rounded-2xl border border-[#C9DDC4] bg-[#FAFCF9] p-6 sm:p-8 mb-5'>
                        <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE] mb-1'>CHECK YOUR UNDERSTANDING</p>
                        <h2 className='text-lg font-bold mb-4'>{quiz ? quiz.title : 'Quiz'}</h2>
                        {quiz
                            ? <QuizTaker quiz={quiz} onPassed={handleQuizPassed} />
                            : <p className='text-sm text-[#6A6F73]'>No quiz for this lesson yet — just mark it complete when you&apos;ve finished reading.</p>}
                    </div>

                    {/* Footer actions: prev / complete / next */}
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4'>
                        {prev ? (
                            <Link
                                to={`/courses/${courseId}/lessons/${prev.id}`}
                                className='flex-1 flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#C9DDC4] hover:border-[#A9D8AE] text-sm font-medium'
                            >
                                <ArrowLeft size={15} />
                                <span className='truncate'>{prev.title}</span>
                            </Link>
                        ) : <div className='flex-1 hidden sm:block' />}

                        <button
                            onClick={handleToggleComplete}
                            disabled={completing}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-60 ${
                                isCompleted ? 'bg-[#DCEFD6] hover:bg-[#D2E8CC] text-[#1F2225]' : 'bg-[#A9D8AE] text-white hover:bg-[#96CC9C]'
                            }`}
                        >
                            {completing ? '…' : isCompleted ? (<><Check size={15} /> Completed — undo</>) : (<><Play size={15} /> Mark as complete</>)}
                        </button>

                        {next ? (
                            <Link
                                to={`/courses/${courseId}/lessons/${next.id}`}
                                className='flex-1 flex items-center justify-end gap-2 px-5 py-3 rounded-xl bg-white border border-[#C9DDC4] hover:border-[#A9D8AE] text-sm font-medium'
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
