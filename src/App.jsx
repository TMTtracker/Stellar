import Landing from './Pages/Landing/Landing'
import Dashboard from '@/Pages/Dashboard'
import Courses from '@/Pages/Courses'
import Communities from '@/Pages/Communities'
import Leaderboard from '@/components/Leaderboard/Leaderboard'
import Shop from '@/Pages/Shop'
import { Outlet, Route, Routes } from 'react-router-dom'
import CourseShow from '@/Pages/Courses/show'
import RequireAuth from '@/components/RequireAuth'

function App() {
    return (
        <Routes>
            <Route path='/' element={<Landing />} />

            <Route
                path='/dashboard'
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />
            <Route
                path='/courses'
                element={
                    <RequireAuth>
                        <Outlet />
                    </RequireAuth>
                }
            >
                <Route index element={<Courses />} />
                <Route path='show' element={<CourseShow />} />
            </Route>
            <Route
                path='/communities'
                element={
                    <RequireAuth>
                        <Communities />
                    </RequireAuth>
                }
            />
            <Route
                path='/leaderboard'
                element={
                    <RequireAuth>
                        <Leaderboard />
                    </RequireAuth>
                }
            />
            <Route
                path='/shop'
                element={
                    <RequireAuth>
                        <Shop />
                    </RequireAuth>
                }
            />
        </Routes>
    )
}

export default App
