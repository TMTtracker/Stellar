import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function RequireAuth({ children }) {
    const { user, loading } = useAuth()
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

    return children
}
