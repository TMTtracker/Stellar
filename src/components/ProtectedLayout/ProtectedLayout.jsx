import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Users, Home as House, Zap, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/communities', icon: Users, label: 'Community' }
]

function ProtectedLayout({ children }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, signOut } = useAuth()

    const isDashboard = location.pathname.startsWith('/dashboard')

    const initials = (() => {
        const name = user?.user_metadata?.full_name || user?.email || 'ST'
        const parts = name.split(/[@\s]+/).filter(Boolean)
        return (parts[0]?.[0] || 'S').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
    })()

    async function handleLogout() {
        try {
            await signOut()
            navigate('/')
        } catch (e) {
            console.error('[auth] sign out failed:', e.message)
        }
    }

    return (
        <div className='min-h-screen bg-[#DCEFD6] text-[#1F2225] flex' style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            {/* Left icon rail */}
            {!isDashboard && (
                <nav className='w-16 shrink-0 bg-[#DCEFD6] border-r border-[#C9DDC4] flex flex-col items-center py-6 gap-2'>
                    <Link to='/dashboard' className='w-9 h-9 rounded-md bg-[#141814] flex items-center justify-center mb-6'>
                        <span className='text-white text-xs font-bold'>{'</>'}</span>
                    </Link>

                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => `relative group w-full flex justify-center ${isActive ? '' : ''}`}>
                            <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${location.pathname.startsWith(to) ? 'bg-[#141814] text-white' : 'text-[#6A6F73] hover:bg-[#D2E8CC] hover:text-[#1F2225]'}`} aria-label={label}>
                                <Icon size={17} />
                            </button>
                        </NavLink>
                    ))}
                </nav>
            )}

            {/* Main column */}
            <div className='flex-1 flex flex-col'>
                {/* Top bar */}
                {!isDashboard && (
                    <header className='flex items-center justify-between px-10 py-6'>
                        <div>
                            <p className='font-extrabold tracking-tight text-lg leading-none'>STELLAR</p>
                            <p className='text-[#6A6F73] text-sm'>{location.pathname.startsWith('/courses') ? 'Courses' : location.pathname.startsWith('/communities') ? 'Community' : 'Your World'}</p>
                        </div>

                        <div className='flex items-center gap-4'>
                            <div className='flex items-center gap-2 bg-white border border-[#C9DDC4] px-4 py-2 rounded-full'>
                                <Zap size={16} className='text-[#A9D8AE]' />
                                <span className='text-sm font-bold'>1,240 XP</span>
                            </div>
                            <div className='w-10 h-10 rounded-full bg-[#141814] text-white flex items-center justify-center font-bold text-xs' title={user?.email || ''}>{initials}</div>
                            <button onClick={handleLogout} aria-label='Log out' title='Log out' className='w-10 h-10 rounded-full bg-white border border-[#C9DDC4] text-[#6A6F73] flex items-center justify-center hover:border-[#D9605B] hover:text-[#D9605B] transition-colors'>
                                <LogOut size={16} />
                            </button>
                        </div>
                    </header>
                )}

                {/* Page content */}
                <main className={isDashboard ? 'flex-1' : 'flex-1 px-10 pb-10'}>{children}</main>
            </div>
        </div>
    )
}

export default ProtectedLayout
