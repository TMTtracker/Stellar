import { Check, Clock, Play, BookOpen, Lock, Zap, Coins, Box, TreePine, Gem, Mountain, ChevronLeft } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import { Link } from 'react-router-dom'

const course = {
    title: 'Intro to Algebra',
    subject: 'Mathematics',
    chapters: 8,
    completed: 3,
    time: '8h',
    color: 'bg-[#B9D1E5]',
    description: 'Build a solid foundation in algebraic thinking, from variables and expressions through to solving multi-step equations.'
}

const materialIcon = {
    Bricks: Box,
    Timber: TreePine,
    'Rare gem': Gem,
    Stone: Mountain
}

const lessons = [
    {
        title: 'Variables and expressions',
        duration: '12 min',
        difficulty: 'Easy',
        status: 'completed',
        xp: 40,
        coins: 15,
        material: { name: 'Bricks', qty: 2 }
    },
    {
        title: 'Linear equations',
        duration: '15 min',
        difficulty: 'Easy',
        status: 'completed',
        xp: 40,
        coins: 15,
        material: { name: 'Bricks', qty: 2 }
    },
    {
        title: 'Inequalities',
        duration: '18 min',
        difficulty: 'Medium',
        status: 'completed',
        xp: 60,
        coins: 20,
        material: { name: 'Timber', qty: 3 }
    },
    {
        title: 'Systems of equations',
        duration: '22 min',
        difficulty: 'Medium',
        status: 'current',
        xp: 60,
        coins: 20,
        material: { name: 'Timber', qty: 3 }
    },
    {
        title: 'Quadratic equations',
        duration: '25 min',
        difficulty: 'Hard',
        status: 'locked',
        xp: 90,
        coins: 30,
        material: { name: 'Rare gem', qty: 1 }
    },
    {
        title: 'Polynomials',
        duration: '20 min',
        difficulty: 'Hard',
        status: 'locked',
        xp: 90,
        coins: 30,
        material: { name: 'Rare gem', qty: 1 }
    }
]

const difficultyColor = {
    Easy: 'text-[#6FAE73] bg-[#E1F0DF]',
    Medium: 'text-[#C79A3E] bg-[#F5E9D3]',
    Hard: 'text-[#C4634F] bg-[#F5DED9]'
}

export default function CourseShow() {
    const pct = Math.round((course.completed / course.chapters) * 100)
    const totalXp = lessons.reduce((sum, l) => sum + l.xp, 0)
    const totalCoins = lessons.reduce((sum, l) => sum + l.coins, 0)

    return (
        <ProtectedLayout>
            <Link to='/courses' className='flex items-center gap-1.5 text-sm font-medium text-[#6A6F73] hover:text-[#1F2225] mb-6'>
                <ChevronLeft size={16} /> Back to courses
            </Link>

            <div className='flex items-start justify-between mb-8'>
                <div>
                    <p className='text-[11px] font-bold tracking-wider text-[#B9D1E5]'>{course.subject.toUpperCase()}</p>
                    <h1 className='text-3xl font-extrabold tracking-tight mt-1'>{course.title}</h1>
                    <p className='text-sm text-[#6A6F73] mt-2 max-w-xl'>{course.description}</p>
                </div>
                <div className={`${course.color} w-14 h-14 rounded-xl flex items-center justify-center shrink-0`}>
                    <BookOpen size={24} className='text-white' />
                </div>
            </div>

            {/* Progress + total rewards */}
            <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-8'>
                <div className='bg-white rounded-2xl border border-[#C9DDC4] p-5'>
                    <div className='flex items-center justify-between text-xs mb-2'>
                        <span className='font-medium text-[#6A6F73]'>Course progress</span>
                        <span className='text-[#6A6F73]'>
                            {course.completed}/{course.chapters}
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
            </div>

            {/* Lessons list */}
            <h2 className='text-lg font-bold mb-4'>Lessons</h2>
            <div className='flex flex-col gap-3'>
                {lessons.map((lesson, i) => {
                    const MaterialIcon = materialIcon[lesson.material.name]
                    const isLocked = lesson.status === 'locked'
                    const isCompleted = lesson.status === 'completed'

                    return (
                        <div key={lesson.title} className={`bg-white rounded-2xl border flex items-center gap-4 px-5 py-4 ${lesson.status === 'current' ? 'border-[#A9D8AE] ring-1 ring-[#A9D8AE]' : 'border-[#C9DDC4]'} ${isLocked ? 'opacity-60' : ''}`}>
                            <div className='w-8 h-8 rounded-full bg-[#EFF3EE] flex items-center justify-center text-xs font-bold text-[#6A6F73] shrink-0'>{i + 1}</div>

                            <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2'>
                                    <h3 className='font-bold text-sm truncate'>{lesson.title}</h3>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${difficultyColor[lesson.difficulty]}`}>{lesson.difficulty}</span>
                                </div>
                                <div className='flex items-center gap-1 text-xs text-[#6A6F73] mt-1'>
                                    <Clock size={12} /> {lesson.duration}
                                </div>
                            </div>

                            <div className='hidden sm:flex items-center gap-4 text-xs text-[#6A6F73] shrink-0'>
                                <span className='flex items-center gap-1'>
                                    <Zap size={13} className='text-[#C79A3E]' /> {lesson.xp} XP
                                </span>
                                <span className='flex items-center gap-1'>
                                    <Coins size={13} className='text-[#C79A3E]' /> {lesson.coins}
                                </span>
                                <span className='flex items-center gap-1'>
                                    <MaterialIcon size={13} className='text-[#6A6F73]' /> {lesson.material.qty} {lesson.material.name}
                                </span>
                            </div>

                            <button
                                disabled={isLocked}
                                className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-colors ${
                                    isLocked ? 'bg-[#EFF3EE] text-[#9AA09B] cursor-not-allowed' : isCompleted ? 'bg-[#DCEFD6] text-[#1F2225] hover:bg-[#D2E8CC]' : 'bg-[#A9D8AE] text-white hover:bg-[#96CC9C]'
                                }`}
                            >
                                {isLocked ? (
                                    <>
                                        <Lock size={14} /> Locked
                                    </>
                                ) : isCompleted ? (
                                    <>
                                        <Check size={14} /> Review
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} /> Start
                                    </>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </ProtectedLayout>
    )
}
