import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// `role` restricts the route to one account type; the other type is sent
// to its own home (instructors -> /instructor, students -> /dashboard).
export default function RequireAuth({ children, role }) {
    const { user, loading, role: userRole } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-[#DCEFD6] text-[#1F2225]'>
                <p className='text-sm font-medium animate-pulse'>Loading your world...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to='/' state={{ from: location }} replace />
    }

    if (role && userRole !== role) {
        return <Navigate to={userRole === 'instructor' ? '/instructor' : '/dashboard'} replace />
    }

    return children
}
