import { useEffect, useState } from 'react'
import { Check, Clock, Play, BookOpen, Code, MessagesSquare } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { Link } from 'react-router-dom'
import { listCoursesWithProgress } from '@/services/courses'

const iconMap = {
    BookOpen,
    Code,
    MessagesSquare
}

function courseIcon(name) {
    return iconMap[name] ?? BookOpen
}

export default function Courses() {
    const [courses, setCourses] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')

        const t = setTimeout(async () => {
            try {
                const rows = await listCoursesWithProgress({ search })
                if (!cancelled) setCourses(rows)
            } catch (e) {
                if (!cancelled) setError(e.message ?? 'Failed to load courses')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }, search ? 300 : 0)

        return () => {
            cancelled = true
            clearTimeout(t)
        }
    }, [search])

    return (
        <ProtectedLayout>
            <div className='mb-6'>
                <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>LEARN</p>
                <h1 className='text-3xl font-extrabold tracking-tight'>Your Courses</h1>
            </div>

            {/* Search / filter bar */}
            <div className='flex items-center gap-3 mb-8'>
                <div className='flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-[#C9DDC4] rounded-xl'>
                    <BookOpen size={18} className='text-[#6A6F73]' />
                    <input
                        type='text'
                        placeholder='Search courses...'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className='bg-transparent outline-none text-sm flex-1'
                    />
                </div>
                <span className='px-4 py-3 bg-white border border-[#C9DDC4] rounded-xl text-sm font-medium text-[#6A6F73]'>
                    {courses.length} course{courses.length === 1 ? '' : 's'}
                </span>
            </div>

            {loading && <p className='text-sm text-[#6A6F73]'>Loading courses…</p>}

            {!loading && error && (
                <div className='bg-white rounded-2xl border border-red-200 p-6 text-sm'>
                    <p className='font-bold text-red-600 mb-1'>Couldn&apos;t load courses</p>
                    <p className='text-[#6A6F73] mb-3'>{error}</p>
                    {error.includes('courses') && (
                        <p className='text-[#6A6F73]'>
                            Have you run <code className='bg-muted px-1 rounded'>supabase/migrations/001_course_system.sql</code> and{' '}
                            <code className='bg-muted px-1 rounded'>supabase/seed.sql</code> in the Supabase SQL Editor?
                        </p>
                    )}
                </div>
            )}

            {!loading && !error && courses.length === 0 && (
                <div className='bg-white rounded-2xl border border-[#C9DDC4] p-10 text-center'>
                    <p className='font-bold mb-1'>No courses yet</p>
                    <p className='text-sm text-[#6A6F73]'>Run <code className='bg-muted px-1 rounded'>supabase/seed.sql</code> to add starter courses, or create one in Supabase.</p>
                </div>
            )}

            {!loading && !error && courses.length > 0 && (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5'>
                    {courses.map(course => {
                        const Icon = courseIcon(course.icon)
                        const total = course.total ?? 0
                        const completed = course.completed ?? 0
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                        return (
                            <div key={course.id} className='bg-white rounded-2xl border border-[#C9DDC4] overflow-hover flex flex-col'>
                                <div className='px-5 pt-5 flex items-center justify-between'>
                                    <div className='w-10 h-10 rounded-lg flex items-center justify-center' style={{ backgroundColor: course.color ?? '#A9D8AE' }}>
                                        <Icon size={18} className='text-white' />
                                    </div>
                                    <span className='text-xs font-medium text-[#6A6F73] bg-muted px-3 py-1 rounded-full'>{course.subject}</span>
                                </div>

                                <div className='px-5 pt-4'>
                                    <h3 className='font-bold leading-snug'>{course.title}</h3>
                                    <div className='flex items-center gap-4 mt-2 text-xs text-[#6A6F73]'>
                                        <span className='flex items-center gap-1'>
                                            <BookOpen size={13} /> {total} chapters
                                        </span>
                                        <span className='flex items-center gap-1'>
                                            <Clock size={13} /> {course.estimated_hours ? `${course.estimated_hours}h` : '—'}
                                        </span>
                                    </div>
                                </div>

                                <div className='px-5 pt-4 mt-auto'>
                                    <div className='flex items-center justify-between text-xs mb-1.5'>
                                        <span className='font-medium text-[#6A6F73]'>{pct}% complete</span>
                                        <span className='text-[#6A6F73]'>
                                            {completed}/{total}
                                        </span>
                                    </div>
                                    <div className='w-full h-2 rounded-full bg-[#D1E5CC] overflow-hidden'>
                                        <div className='h-full bg-[#A9D8AE] rounded-full' style={{ width: `${pct}%` }} />
                                    </div>
                                </div>

                                <div className='px-5 pb-5 pt-4'>
                                    <Link to={`/courses/${course.id}`} className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-[#D2E8CC] bg-[#DCEFD6] text-[#1F2225]'>
                                        {pct === 100 ? (
                                            <>
                                                <Check size={16} className='text-[#A9D8AE]' /> Review
                                            </>
                                        ) : pct > 0 ? (
                                            <>
                                                <Play size={16} /> Continue
                                            </>
                                        ) : (
                                            <>
                                                <Play size={16} /> Start
                                            </>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </ProtectedLayout>
    )
}
