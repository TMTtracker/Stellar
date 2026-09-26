import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, Code, Eye, FileText, MessagesSquare, Pencil, Plus, Trash2, Users, FileEdit } from 'lucide-react'
import InstructorLayout from '@/components/Instructor/InstructorLayout'
import { useAuth } from '@/hooks/useAuth'
import { deleteCourse, listMyCourses } from '@/services/instructor'

const iconMap = { BookOpen, Code, MessagesSquare }

function formatMinutes(min) {
    if (!min) return '—'
    const h = Math.floor(min / 60)
    const m = min % 60
    return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

function StatCard({ label, value, icon: Icon }) {
    return (
        <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-5 flex items-center gap-4'>
            <span className='w-10 h-10 rounded-xl bg-[#EFF7EE] dark:bg-[#16241A] flex items-center justify-center'>
                <Icon size={18} className='text-[#3E7A42] dark:text-[#8FE0A0]' />
            </span>
            <div>
                <p className='text-2xl font-extrabold tracking-tight leading-none'>{value}</p>
                <p className='text-xs text-[#6A6F73] dark:text-[#8FA893] mt-1'>{label}</p>
            </div>
        </div>
    )
}

export default function InstructorDashboard() {
    const { user } = useAuth()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        let cancelled = false
        listMyCourses()
            .then(rows => !cancelled && setCourses(rows))
            .catch(e => !cancelled && setError(e.message ?? 'Failed to load your courses'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [])

    async function handleDelete(course) {
        setDeleting(true)
        try {
            await deleteCourse(course.id)
            setCourses(list => list.filter(c => c.id !== course.id))
            setConfirmDelete(null)
        } catch (e) {
            setError(e.message)
        } finally {
            setDeleting(false)
        }
    }

    const firstName = (user?.user_metadata?.full_name || '').split(' ')[0]
    const totals = courses.reduce(
        (t, c) => ({ lessons: t.lessons + c.lessonCount, students: t.students + c.students, published: t.published + (c.is_published ? 1 : 0) }),
        { lessons: 0, students: 0, published: 0 }
    )

    return (
        <InstructorLayout
            actions={
                <Link to='/instructor/courses/new' className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#141814] text-white hover:bg-[#2A2E2B] transition-colors'>
                    <Plus size={16} /> Create new course
                </Link>
            }
        >
            <div className='mb-6'>
                <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>TEACH</p>
                <h1 className='text-3xl font-extrabold tracking-tight'>{firstName ? `Welcome back, ${firstName}` : 'Your courses'}</h1>
                <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1'>Create courses, write lectures, and track how many students are learning with you.</p>
            </div>

            <div className='grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8'>
                <StatCard label='Courses' value={courses.length} icon={BookOpen} />
                <StatCard label='Published' value={totals.published} icon={Eye} />
                <StatCard label='Drafts' value={courses.length - totals.published} icon={FileEdit} />
                <StatCard label='Lectures' value={totals.lessons} icon={FileText} />
                <StatCard label='Enrolled students' value={totals.students} icon={Users} />
            </div>

            {loading && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893]'>Loading your courses…</p>}

            {!loading && error && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-red-200 dark:border-red-900/50 p-6 text-sm mb-6'>
                    <p className='font-bold text-red-600 dark:text-red-400 mb-1'>Something went wrong</p>
                    <p className='text-[#6A6F73] dark:text-[#8FA893]'>{error}</p>
                </div>
            )}

            {!loading && !error && courses.length === 0 && (
                <div className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] p-12 text-center'>
                    <div className='w-12 h-12 rounded-full bg-[#EFF7EE] dark:bg-[#16241A] flex items-center justify-center mx-auto mb-4'>
                        <BookOpen size={20} className='text-[#3E7A42] dark:text-[#8FE0A0]' />
                    </div>
                    <p className='font-bold text-lg'>No courses yet</p>
                    <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-1 mb-5'>Write your first course from scratch, or upload a PDF and let AI draft the lectures.</p>
                    <Link to='/instructor/courses/new' className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#A9D8AE] text-white hover:bg-[#96CC9C]'>
                        <Plus size={16} /> Create new course
                    </Link>
                </div>
            )}

            {!loading && courses.length > 0 && (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5'>
                    {courses.map(course => {
                        const Icon = iconMap[course.icon] ?? BookOpen
                        return (
                            <div key={course.id} className='bg-white dark:bg-[#14171A] rounded-2xl border border-[#C9DDC4] dark:border-[#262E28] flex flex-col'>
                                <div className='px-5 pt-5 flex items-center justify-between'>
                                    <div className='w-10 h-10 rounded-lg flex items-center justify-center' style={{ backgroundColor: course.color ?? '#A9D8AE' }}>
                                        <Icon size={18} className='text-white' />
                                    </div>
                                    <span className={`text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full ${
                                        course.is_published
                                            ? 'bg-[#E1F0DF] text-[#3E7A42] dark:bg-[#1B2B1D] dark:text-[#8FE0A0]'
                                            : 'bg-[#F5E9D3] text-[#A07A2E] dark:bg-[#2A2417] dark:text-[#E3BE72]'
                                    }`}>
                                        {course.is_published ? 'PUBLISHED' : 'DRAFT'}
                                    </span>
                                </div>

                                <div className='px-5 pt-4 flex-1'>
                                    <p className='text-xs text-[#6A6F73] dark:text-[#8FA893]'>{course.subject}</p>
                                    <h3 className='font-bold leading-snug mt-0.5'>{course.title}</h3>
                                    {course.description && <p className='text-sm text-[#6A6F73] dark:text-[#8FA893] mt-2 line-clamp-2'>{course.description}</p>}
                                    <div className='flex items-center gap-4 mt-3 text-xs text-[#6A6F73] dark:text-[#8FA893]'>
                                        <span className='flex items-center gap-1'><FileText size={13} /> {course.lessonCount} lectures</span>
                                        <span className='flex items-center gap-1'><Clock size={13} /> {formatMinutes(course.minutes)}</span>
                                        <span className='flex items-center gap-1'><Users size={13} /> {course.students}</span>
                                    </div>
                                </div>

                                <div className='px-5 pb-5 pt-4 flex items-center gap-2'>
                                    {confirmDelete === course.id ? (
                                        <>
                                            <span className='flex-1 text-xs text-[#C4453A]'>Delete course, its lectures and student progress?</span>
                                            <button onClick={() => setConfirmDelete(null)} disabled={deleting} className='px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#EFF3EE] dark:hover:bg-[#1B211C]'>Cancel</button>
                                            <button onClick={() => handleDelete(course)} disabled={deleting} className='px-3 py-2 rounded-lg text-xs font-medium bg-[#C4453A] text-white hover:bg-[#A93A30] disabled:opacity-60'>
                                                {deleting ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link to={`/instructor/courses/${course.id}/edit`} className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-[#DCEFD6] dark:bg-[#1B211C] hover:bg-[#D2E8CC] dark:hover:bg-[#1E2B20]'>
                                                <Pencil size={15} /> Edit
                                            </Link>
                                            <Link to={`/instructor/courses/${course.id}/preview`} title='Preview as a student' aria-label='Preview as a student' className='w-10 h-10 rounded-xl flex items-center justify-center border border-[#C9DDC4] dark:border-[#262E28] text-[#6A6F73] dark:text-[#8FA893] hover:border-[#A9D8AE]'>
                                                <Eye size={15} />
                                            </Link>
                                            <button onClick={() => setConfirmDelete(course.id)} title='Delete course' aria-label='Delete course' className='w-10 h-10 rounded-xl flex items-center justify-center border border-[#C9DDC4] dark:border-[#262E28] text-[#6A6F73] dark:text-[#8FA893] hover:border-[#C4453A] hover:text-[#C4453A]'>
                                                <Trash2 size={15} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </InstructorLayout>
    )
}
