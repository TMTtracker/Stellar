import { Search, MessageSquare, Heart, Send, Users, TrendingUp, MoreHorizontal } from 'lucide-react'
import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'

const threads = [
    {
        author: 'Aisha R.',
        role: 'Chapter 3 Scholar',
        time: '2h',
        title: 'Best way to remember the key concepts in Chapter 3?',
        body: 'I keep mixing up "supporting details" and the "main idea". Anyone got a trick that worked for you?',
        likes: 12,
        comments: 7,
        tag: 'Study Help'
    },
    {
        author: 'Deniz K.',
        role: 'Level 4 Builder',
        time: '5h',
        title: 'Just unlocked the whole Meadow Grove 🎉',
        body: 'After finishing all the Algebra lessons my world completely transformed. Study really does make it grow.',
        likes: 34,
        comments: 15,
        tag: 'Milestone'
    },
    {
        author: 'Prof. Nafi',
        role: 'Instructor',
        time: '1d',
        title: 'Weekly Challenge: 7-day reading streak starts Monday',
        body: 'Complete one reading lesson a day this week to earn the Seasoned Reader badge and 200 bonus coins.',
        likes: 48,
        comments: 22,
        tag: 'Event'
    }
]

const members = [
    { name: 'You', level: 3, xp: 1240, rank: 12, color: 'bg-[#141814]' },
    { name: 'Priya S.', level: 5, xp: 2110, rank: 3, color: 'bg-[#A9D8AE]' },
    { name: 'Marco L.', level: 4, xp: 1890, rank: 5, color: 'bg-[#B9D1E5]' }
]

const tags = ['All', 'Study Help', 'Milestone', 'Event', 'Questions']

export default function Communities() {
    return (
        <ProtectedLayout>
            <div className='mb-6 flex items-center justify-between'>
                <div>
                    <p className='text-[11px] font-bold tracking-wider text-[#A9D8AE]'>CONNECT</p>
                    <h1 className='text-3xl font-extrabold tracking-tight'>Community</h1>
                </div>
                <button className='flex items-center gap-2 bg-[#A9D8AE] text-white font-medium px-5 py-2.5 rounded-full hover:bg-[#98CD9E] transition-colors'>
                    <Send size={16} /> New Post
                </button>
            </div>

            {/* Search + filters */}
            <div className='mb-6'>
                <div className='flex items-center gap-3 px-4 py-3 bg-white border border-[#C9DDC4] rounded-xl mb-4'>
                    <Search size={18} className='text-[#6A6F73]' />
                    <input type='text' placeholder='Search discussions, members, topics...' className='bg-transparent outline-none text-sm flex-1' />
                </div>
                <div className='flex flex-wrap gap-2'>
                    {tags.map(tag => (
                        <button
                            key={tag}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                tag === 'All' ? 'bg-[#141814] text-white' : 'bg-white border border-[#C9DDC4] text-[#6A6F73] hover:border-[#B7CDB1]'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div className='grid grid-cols-[1fr_300px] gap-6'>
                {/* Threads */}
                <div className='space-y-4'>
                    {threads.map(thread => (
                        <article key={thread.title} className='bg-white rounded-2xl border border-[#C9DDC4] p-5'>
                            <div className='flex items-center justify-between mb-3'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 rounded-full bg-[#A9D8AE] text-white flex items-center justify-center font-bold text-sm'>
                                        {thread.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className='text-sm font-bold'>{thread.author}</p>
                                        <p className='text-xs text-[#6A6F73]'>{thread.role} · {thread.time}</p>
                                    </div>
                                </div>
                                <button className='text-[#6A6F73] hover:text-[#1F2225]'>
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            <span className='inline-block text-[10px] font-bold tracking-wider text-[#A9D8AE] bg-[#DDF0E1] px-2.5 py-1 rounded-full mb-3'>{thread.tag}</span>

                            <h2 className='font-bold leading-snug'>{thread.title}</h2>
                            <p className='text-sm text-[#6A6F73] mt-1.5 leading-relaxed'>{thread.body}</p>

                            <div className='flex items-center gap-6 mt-4 text-sm text-[#6A6F73]'>
                                <button className='flex items-center gap-1.5 hover:text-[#A9D8AE] transition-colors'>
                                    <Heart size={16} /> {thread.likes}
                                </button>
                                <button className='flex items-center gap-1.5 hover:text-[#A9D8AE] transition-colors'>
                                    <MessageSquare size={16} /> {thread.comments}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Members sidebar */}
                <aside className='space-y-6'>
                    <div className='bg-white rounded-2xl p-5 border border-[#C9DDC4]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73]'>LEADERBOARD WEEKLY</p>
                            <TrendingUp size={16} className='text-[#A9D8AE]' />
                        </div>
                        <ul className='space-y-3'>
                            {members.map(m => (
                                <li key={m.name} className='flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <span className='text-xs font-bold text-[#6A6F73] w-4'>{m.rank}</span>
                                        <div className={`w-9 h-9 rounded-full ${m.color} text-white flex items-center justify-center font-bold text-sm`}>
                                            {m.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className='text-sm font-medium'>{m.name}</p>
                                            <p className='text-xs text-[#6A6F73]'>Level {m.level}</p>
                                        </div>
                                    </div>
                                    <span className='text-xs font-bold text-[#6A6F73]'>{m.xp.toLocaleString()} XP</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className='bg-white rounded-2xl p-5 border border-[#C9DDC4]'>
                        <div className='flex items-center justify-between mb-4'>
                            <p className='text-[11px] font-bold tracking-wider text-[#6A6F73]'>ONLINE NOW</p>
                            <Users size={16} className='text-[#A9D8AE]' />
                        </div>
                        <div className='flex -space-x-3'>
                            {['A', 'D', 'P', 'M', 'R'].map(l => (
                                <div key={l} className='w-9 h-9 rounded-full bg-[#141814] text-white flex items-center justify-center text-xs font-bold border-2 border-white'>{l}</div>
                            ))}
                        </div>
                        <p className='text-xs text-[#6A6F73] mt-3'>42 students studying right now.</p>
                    </div>
                </aside>
            </div>
        </ProtectedLayout>
    )
}
