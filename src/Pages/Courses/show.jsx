import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock, Play, BookOpen, Lock, Zap, Coins, Boxes, ChevronLeft, ListChecks } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { Link, useParams } from 'react-router-dom'
import { enrollInCourse, getCourseWithLessons, getCourseProgress, getEnrollment } from '@/services/courses'
import { getLessonsWithQuiz } from '@/services/quizzes'
import { materialIconFor } from '@/lib/materials'

const difficultyColor = {
    Easy: 'text-[#6FAE73] bg-[#E1F0DF]',
    Medium: 'text-[#C79A3E] bg-[#F5E9D3]',
    Hard: 'text-[#C4634F] bg-[#F5DED9]'
}

export default function CourseShow() {
    const { courseId } = useParams()
    const [course, setCourse] = useState(null)
    const [lessons, setLessons] = useState([])
    const [completedIds, setCompletedIds] = useState(new Set())
    const [quizLessonIds, setQuizLessonIds] = useState(new Set())
    const [enrolled, setEnrolled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [enrolling, setEnrolling] = useState(false)

    const load = useCallback(async () => {
        if (!courseId) return
        setLoading(true)
        setError('')
        try {
            const [{ course: c, lessons: l }, progress, enrollment, withQuiz] = await Promise.all([
                getCourseWithLessons(courseId),
                getCourseProgress(courseId),
                getEnrollment(courseId),
                getLessonsWithQuiz(courseId).catch(() => new Set())
            ])
            setCourse(c)
            setLessons(l)
            setCompletedIds(new Set((progress ?? []).map(p => p.lesson_id)))
            setEnrolled(!!enrollment)
            setQuizLessonIds(withQuiz)
        } catch (e) {
            setError(e.message ?? 'Failed to load course')
        } finally {
            setLoading(false)
        }
    }, [courseId])

    useEffect(() => {
        load()
    }, [load])

    const lessonsWithStatus = useMemo(() => {
        const firstIncomplete = lessons.find(l => !completedIds.has(l.id))
        return lessons.map(l => {
            if (completedIds.has(l.id)) return { ...l, status: 'completed' }
            if (firstIncomplete && l.id === firstIncomplete.id) return { ...l, status: 'current' }
            return { ...l, status: 'locked' }
        })
    }, [lessons, completedIds])

    const completed = completedIds.size
    const total = lessons.length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const totalXp = lessons.reduce((sum, l) => sum + (l.xp_reward ?? 0), 0)
    const totalCoins = lessons.reduce((sum, l) => sum + (l.coins_reward ?? 0), 0)
    const totalMaterialsCount = lessons.reduce((sum, l) => sum + (l.material_qty ?? 0), 0)

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

    return (
        <ProtectedLayout>
            <Link to='/courses' className='flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] hover:text-[#1F2225] mb-6'>
                <ChevronLeft size={16} /> Back to courses
            </Link>

            {loading && <p className='text-sm text-[#6A6F73]'>Loading course…</p>}

            {!loading && error && (
                <div className='bg-white rounded-2xl border border-red-200 p-6 text-sm mb-6'>
                    <p className='font-bold text-red-600 mb-1'>Couldn&apos;t load course</p>
                    <p className='text-[#6A6F73]'>{error}</p>
                </div>
            )}

            {!loading && !error && course && (
                <>
                    <div className='flex items-start justify-between mb-8'>
                        <div>
                            <p className='text-[11px] font-bold tracking-wider' style={{ color: course.color ?? '#B9D1E5' }}>{(course.subject ?? '').toUpperCase()}</p>
                            <h1 className='text-3xl font-extrabold tracking-tight mt-1'>{course.title}</h1>
                            <p className='text-sm text-[#6A6F73] mt-2 max-w-xl'>{course.description}</p>
                            {!enrolled && (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className='mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-[#A9D8AE] text-white hover:bg-[#96CC9C] disabled:opacity-60'
                                >
                                    <Play size={14} /> {enrolling ? 'Enrolling…' : 'Enroll in course'}
                                </button>
                            )}
                        </div>
                        <div className='w-14 h-14 rounded-xl flex items-center justify-center shrink-0' style={{ backgroundColor: course.color ?? '#B9D1E5' }}>
                            <BookOpen size={24} className='text-white' />
                        </div>
                    </div>

                    {/* Progress + total rewards */}
                    <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-8'>
                        <div className='bg-white rounded-2xl border border-[#C9DDC4] p-5'>
                            <div className='flex items-center justify-between text-xs mb-2'>
                                <span className='font-medium text-[#6A6F73]'>Course progress</span>
                                <span className='text-[#6A6F73]'>
                                    {completed}/{total}
                                </span>
                            </div>
                            <div className='w-full h-2 rounded-full bg-[#D1E5CC] overflow-hidden mb-1'>
                                <div className='h-full bg-[#A9D8AE] rounded-full' style={{ width: `${pct}%` }} />
                            </div>
                            <p className='text-xs text-[#6A6F73]'>{pct}% complete</p>
                        </div>

                        <div className='bg-white rounded-2xl border border-[#C9DDC4] p-5 flex items-center gap-3'>
                            <div className='w-10 h-10 rounded-lg bg-[#FBF0D9] flex items-center justify-center shrink-0'>
                                <Zap size={18} className='text-[#C79A3E]' />
                            </div>
                            <div>
                                <p className='text-lg font-bold leading-none'>{totalXp} XP</p>
                                <p className='text-xs text-[#6A6F73] mt-1'>total in this course</p>
                            </div>
                        </div>

                        <div className='bg-white rounded-2xl border border-[#C9DDC4] p-5 flex items-center gap-3'>
                            <div className='w-10 h-10 rounded-lg bg-[#FBF0D9] flex items-center justify-center shrink-0'>
                                <Coins size={18} className='text-[#C79A3E]' />
                            </div>
                            <div>
                                <p className='text-lg font-bold leading-none'>{totalCoins}</p>
                                <p className='text-xs text-[#6A6F73] mt-1'>coins available</p>
                            </div>
                        </div>

                        {totalMaterialsCount > 0 && (
                            <div className='bg-white rounded-2xl border border-[#C9DDC4] p-5 flex items-center gap-3'>
                                <div className='w-10 h-10 rounded-lg bg-[#E1F0DF] flex items-center justify-center shrink-0'>
                                    <Boxes size={18} className='text-[#6FAE73]' />
                                </div>
                                <div>
                                    <p className='text-lg font-bold leading-none'>{totalMaterialsCount}</p>
                                    <p className='text-xs text-[#6A6F73] mt-1'>materials in this course</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Lessons list */}
                    <h2 className='text-lg font-bold mb-4'>Lessons</h2>
                    {lessonsWithStatus.length === 0 && (
                        <p className='text-sm text-[#6A6F73]'>No lessons in this course yet.</p>
                    )}
                    <div className='flex flex-col gap-3'>
                        {lessonsWithStatus.map((lesson, i) => {
                            const MaterialIcon = materialIconFor(lesson.material_name)
                            const isLocked = lesson.status === 'locked'
                            const isCompleted = lesson.status === 'completed'
                            const hasQuiz = quizLessonIds.has(lesson.id)

                            return (
                                <div key={lesson.id} className={`bg-white rounded-2xl border flex items-center gap-4 px-5 py-4 ${lesson.status === 'current' ? 'border-[#A9D8AE] ring-1 ring-[#A9D8AE]' : 'border-[#C9DDC4]'} ${isLocked ? 'opacity-60' : ''}`}>
                                    <div className='w-8 h-8 rounded-full bg-[#EFF3EE] flex items-center justify-center text-xs font-bold text-[#6A6F73] shrink-0'>{i + 1}</div>

                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2 flex-wrap'>
                                            <h3 className='font-bold text-sm truncate'>{lesson.title}</h3>
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${difficultyColor[lesson.difficulty] ?? difficultyColor.Easy}`}>{lesson.difficulty}</span>
                                            {hasQuiz && (
                                                <span className='flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EFF3EE] text-[#6A6F73] shrink-0'>
                                                    <ListChecks size={11} /> Quiz
                                                </span>
                                            )}
                                        </div>
                                        <div className='flex items-center gap-1 text-xs text-[#6A6F73] mt-1'>
                                            <Clock size={12} /> {lesson.duration_min} min
                                        </div>
                                        {lesson.summary && (
                                            <p className='text-xs text-[#6A6F73] mt-1 truncate'>{lesson.summary}</p>
                                        )}
                                    </div>

                                    <div className='hidden sm:flex items-center gap-4 text-xs text-[#6A6F73] shrink-0'>
                                        <span className='flex items-center gap-1'>
                                            <Zap size={13} className='text-[#C79A3E]' /> {lesson.xp_reward} XP
                                        </span>
                                        <span className='flex items-center gap-1'>
                                            <Coins size={13} className='text-[#C79A3E]' /> {lesson.coins_reward}
                                        </span>
                                        <span className='flex items-center gap-1'>
                                            <MaterialIcon size={13} className='text-[#6A6F73]' /> {lesson.material_qty} {lesson.material_name}
                                        </span>
                                    </div>

                                    {isLocked ? (
                                        <span className='shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-xs bg-[#EFF3EE] text-[#9AA09B] cursor-not-allowed'>
                                            <Lock size={14} /> Locked
                                        </span>
                                    ) : (
                                        <Link
                                            to={`/courses/${courseId}/lessons/${lesson.id}`}
                                            className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-colors ${
                                                isCompleted ? 'bg-[#DCEFD6] text-[#1F2225] hover:bg-[#D2E8CC]' : 'bg-[#A9D8AE] text-white hover:bg-[#96CC9C]'
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <>
                                                    <Check size={14} /> Review
                                                </>
                                            ) : (
                                                <>
                                                    <Play size={14} /> Start
                                                </>
                                            )}
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </ProtectedLayout>
    )
}
