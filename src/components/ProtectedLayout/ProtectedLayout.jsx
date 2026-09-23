import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Users, Home as House, Zap, Coins, LogOut, Sparkles, User, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { useAvatar, isImageAvatar } from '@/hooks/useAvatar'

const navItems = [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/communities', icon: Users, label: 'Community' },
    { to: '/ai', icon: Sparkles, label: 'AI Tutor' }
]

const bottomNavItems = [
    { to: '/profile', icon: User, label: 'Profile' }
]

function ProtectedLayout({ children }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const { xp, coins } = useWallet()
    const { avatar } = useAvatar()

    const isDashboard = location.pathname.startsWith('/dashboard')

    const initials = (() => {
        const name = user?.user_metadata?.full_name || user?.email || 'ST'
        const parts = name.split(/[@\s]+/).filter(Boolean)
        return (parts[0]?.[0] || 'S').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
    })()
    const avatarIsImage = isImageAvatar(avatar)

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
            {/* Left icon rail - fixed height + its own scroll, so long page
                content (e.g. a long list of posts) can never push it down */}
            {!isDashboard && (
                <nav className='w-16 shrink-0 h-screen overflow-y-auto bg-[#DCEFD6] dark:bg-[#0E1210] border-r border-[#C9DDC4] dark:border-[#20291F] flex flex-col items-center py-6 gap-2 justify-between'>
                    <div className='flex flex-col items-center gap-2 w-full'>
                        <Link to='/dashboard' className='w-9 h-9 rounded-md bg-[#141814] flex items-center justify-center mb-6'>
                            <span className='text-white text-xs font-bold'>{'</>'}</span>
                        </Link>

                        {navItems.map(({ to, icon: Icon, label }) => (
                            <NavLink key={to} to={to} className={({ isActive }) => `relative group w-full flex justify-center ${isActive ? '' : ''}`}>
                                <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${location.pathname.startsWith(to) ? 'bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C]' : 'text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#D2E8CC] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'}`} aria-label={label}>
                                    <Icon size={17} />
                                </button>
                            </NavLink>
                        ))}
                    </div>

                    {/* Bottom: profile - synced with profile picture */}
                    <div className='flex flex-col items-center gap-2 w-full border-t border-[#C9DDC4] dark:border-[#20291F] pt-4 mt-4'>
                        {bottomNavItems.map(({ to, icon: Icon, label }) => (
                            <NavLink key={to} to={to} className='relative group w-full flex justify-center'>
                                <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors overflow-hidden ${location.pathname.startsWith(to) ? 'bg-[#141814] dark:bg-[#A9D8AE] text-white dark:text-[#0B0D0C]' : 'text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#D2E8CC] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7]'}`} aria-label={label}>
                                    {avatarIsImage ? (
                                        <img src={avatar} alt="Profile avatar" className="w-full h-full object-cover rounded-lg" />
                                    ) : avatar ? (
                                        <span className="text-base leading-none">{avatar}</span>
                                    ) : (
                                        <Icon size={17} />
                                    )}
                                </span>
                            </NavLink>
                        ))}
                    </div>
                </nav>
            )}

            {/* Main column */}
            <div className='flex-1 flex flex-col min-h-0'>
                {/* Top bar - also fixed, only the content below it scrolls */}
                {!isDashboard && (
                    <header className='shrink-0 flex items-center justify-between px-10 py-6'>
                        <div>
                            <p className='font-extrabold tracking-tight text-lg leading-none'>STELLAR</p>
                            <p className='text-[#6A6F73] dark:text-[#8FA893] text-sm'>{location.pathname.startsWith('/courses') ? 'Courses' : location.pathname.startsWith('/leaderboard') ? 'Leaderboard' : location.pathname.startsWith('/communities') ? 'Community' : location.pathname.startsWith('/ai') ? 'AI Tutor' : 'Your World'}</p>
                        </div>

                        <div className='flex items-center gap-4'>
                            <div className='flex items-center gap-2 bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] px-4 py-2 rounded-full' title='Lifetime XP'>
                                <Zap size={16} className='text-[#A9D8AE]' />
                                <span className='text-sm font-bold'>{xp.toLocaleString()} XP</span>
                            </div>
                            <div className='flex items-center gap-2 bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] px-4 py-2 rounded-full' title='Spendable coins'>
                                <Coins size={16} className='text-[#E8933E]' />
                                <span className='text-sm font-bold'>{coins.toLocaleString()}</span>
                            </div>
                            <Link
                                to='/profile'
                                className={`w-10 h-10 rounded-full bg-[#141814] text-white flex items-center justify-center font-bold text-xs hover:bg-[#232823] transition-colors overflow-hidden ${avatarIsImage ? 'p-0' : ''}`}
                                title={user?.email || 'Profile'}
                                aria-label="Profile"
                            >
                                {avatarIsImage ? (
                                    <img src={avatar} alt="Profile avatar" className="w-full h-full object-cover rounded-full" />
                                ) : avatar ? (
                                    <span className="text-base leading-none">{avatar}</span>
                                ) : (
                                    initials
                                )}
                            </Link>
                            <button onClick={handleLogout} aria-label='Log out' title='Log out' className='w-10 h-10 rounded-full bg-white dark:bg-[#14171A] border border-[#C9DDC4] dark:border-[#262E28] text-[#6A6F73] dark:text-[#8FA893] flex items-center justify-center hover:border-[#D9605B] hover:text-[#D9605B] transition-colors'>
                                <LogOut size={16} />
                            </button>
                        </div>
                    </header>
                )}

                {/* Page content - the only part that scrolls */}
                <main className={isDashboard ? 'flex-1 overflow-hidden' : 'flex-1 min-h-0 overflow-y-auto px-10 pb-10'}>{children}</main>
            </div>
        </div>
    )
}

export default ProtectedLayout
