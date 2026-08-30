import { Check, Clock, Play, BookOpen, Code, MessagesSquare } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { Link } from 'react-router-dom'

const courses = [
    {
        title: 'English Reading Comprehension',
        subject: 'Language',
        chapters: 5,
        completed: 2,
        time: '4.5h',
        icon: BookOpen,
        color: 'bg-[#A9D8AE]',
        href: '/courses/show'
    },
    {
        title: 'Intro to Algebra',
        subject: 'Mathematics',
        chapters: 8,
        completed: 0,
        time: '8h',
        icon: Code,
        color: 'bg-[#B9D1E5]'
    },
    {
        title: 'World History: Modern Era',
        subject: 'History',
        chapters: 6,
        completed: 6,
        time: '6h',
        icon: MessagesSquare,
        color: 'bg-[#E5D1B9]'
    }
]

export default function Courses() {
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
                    <input type='text' placeholder='Search courses...' className='bg-transparent outline-none text-sm flex-1' />
                </div>
                <button className='px-4 py-3 bg-white border border-[#C9DDC4] rounded-xl text-sm font-medium text-[#6A6F73] hover:border-[#B7CDB1]'>Filter</button>
            </div>

            <div className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5'>
                {courses.map(course => {
                    const Icon = course.icon
                    const pct = Math.round((course.completed / course.chapters) * 100)
                    return (
                        <div key={course.title} className='bg-white rounded-2xl border border-[#C9DDC4] overflow-hover flex flex-col'>
                            <div className={`px-5 pt-5 flex items-center justify-between`}>
                                <div className={`${course.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                                    <Icon size={18} className='text-white' />
                                </div>
                                <span className='text-xs font-medium text-[#6A6F73] bg-muted px-3 py-1 rounded-full'>{course.subject}</span>
                            </div>

                            <div className='px-5 pt-4'>
                                <h3 className='font-bold leading-snug'>{course.title}</h3>
                                <div className='flex items-center gap-4 mt-2 text-xs text-[#6A6F73]'>
                                    <span className='flex items-center gap-1'>
                                        <BookOpen size={13} /> {course.chapters} chapters
                                    </span>
                                    <span className='flex items-center gap-1'>
                                        <Clock size={13} /> {course.time}
                                    </span>
                                </div>
                            </div>

                            <div className='px-5 pt-4 mt-auto'>
                                <div className='flex items-center justify-between text-xs mb-1.5'>
                                    <span className='font-medium text-[#6A6F73]'>{pct}% complete</span>
                                    <span className='text-[#6A6F73]'>
                                        {course.completed}/{course.chapters}
                                    </span>
                                </div>
                                <div className='w-full h-2 rounded-full bg-[#D1E5CC] overflow-hidden'>
                                    <div className='h-full bg-[#A9D8AE] rounded-full' style={{ width: `${pct}%` }} />
                                </div>
                            </div>

                            <div className='px-5 pb-5 pt-4'>
                                <Link to={course.href ? course.href : '#'} className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-[#D2E8CC] bg-[#DCEFD6] text-[#1F2225]'>
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

                {/* New course card */}
                <button className='rounded-2xl border-2 border-dashed border-[#C9DDC4] flex flex-col items-center justify-center py-16 text-[#6A6F73] hover:border-[#A9D8AE] transition-colors'>
                    <div className='w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3'>
                        <span className='text-2xl font-bold'>+</span>
                    </div>
                    <span className='text-sm font-medium'>Browse More Courses</span>
                </button>
            </div>
        </ProtectedLayout>
    )
}
