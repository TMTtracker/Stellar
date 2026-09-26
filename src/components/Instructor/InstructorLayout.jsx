import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
    { to: '/instructor', end: true, icon: LayoutDashboard, label: 'My courses' },
    { to: '/instructor/courses/new', icon: Plus, label: 'Create course' }
]

/** Chrome for instructor pages - no XP / coins / game world, unlike ProtectedLayout. */
export default function InstructorLayout({ subtitle = 'Instructor Studio', actions, children }) {
    const navigate = useNavigate()
    const { user, signOut } = useAuth()

    const name = user?.user_metadata?.full_name || user?.email || 'Instructor'
    const initials = name.split(/[@\s]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')

    async function handleLogout() {
        try {
            await signOut()
            navigate('/')
        } catch (e) {
            console.error('[auth] sign out failed:', e.message)
        }
    }

    return (
        <div className='h-screen overflow-hidden bg-[#DCEFD6] dark:bg-[#0E1210] text-[#1F2225] dark:text-[#F2F5F0] flex' style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <nav className='w-16 shrink-0 h-screen overflow-y-auto border-r border-[#C9DDC4] dark:border-[#20291F] flex flex-col items-center py-6 gap-2 justify-between'>
                <div className='flex flex-col items-center gap-2 w-full'>
                    <Link to='/instructor' className='w-9 h-9 rounded-md bg-[#141814] flex items-center justify-center mb-6'>
                        <span className='text-white text-xs font-bold'>{'</>'}</span>
                    </Link>
                    {navItems.map(({ to, end, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            title={label}
                            aria-label={label}
                            className={({ isActive }) => `w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                isActive
                                    ? 'bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C]'
                                    : 'text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#D2E8CC] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'
                            }`}
                        >
                            <Icon size={17} />
                        </NavLink>
                    ))}
                </div>
                <button
                    onClick={handleLogout}
                    aria-label='Log out'
                    title='Log out'
                    className='w-9 h-9 rounded-lg flex items-center justify-center text-[#6A6F73] dark:text-[#8FA893] hover:text-[#D9605B] hover:bg-[#F5DED9] dark:hover:bg-[#2A1A17] transition-colors'
                >
                    <LogOut size={17} />
                </button>
            </nav>

            <div className='flex-1 flex flex-col min-h-0'>
                <header className='shrink-0 flex items-center justify-between gap-4 px-10 py-6'>
                    <div>
                        <p className='font-extrabold tracking-tight text-lg leading-none'>STELLAR</p>
                        <p className='text-[#6A6F73] dark:text-[#8FA893] text-sm'>{subtitle}</p>
                    </div>
                    <div className='flex items-center gap-3'>
                        {actions}
                        <span className='hidden sm:inline text-[11px] font-bold tracking-wider text-[#3E7A42] dark:text-[#8FE0A0] bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] px-3 py-1.5 rounded-full'>INSTRUCTOR</span>
                        <span className='w-10 h-10 rounded-full bg-[#141814] text-white flex items-center justify-center font-bold text-xs' title={user?.email}>
                            {initials || 'IN'}
                        </span>
                    </div>
                </header>
                <main className='flex-1 min-h-0 overflow-y-auto px-10 pb-10'>{children}</main>
            </div>
        </div>
    )
}
