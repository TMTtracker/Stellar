import Landing from './Pages/Landing/Landing'
import Dashboard from '@/Pages/Dashboard'
import Courses from '@/Pages/Courses'
import Communities from '@/Pages/Communities'
import Leaderboard from '@/components/Leaderboard/Leaderboard'
import Shop from '@/Pages/Shop'
import { Outlet, Route, Routes } from 'react-router-dom'
import CourseShow from '@/Pages/Courses/show'

function App() {
    return (
        <Routes>
            <Route path='/' element={<Landing />} />

            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/courses' element={<Outlet />}>
                <Route index element={<Courses />} />
                <Route path='show' element={<CourseShow />} />
            </Route>
            <Route path='/communities' element={<Communities />} />
            <Route path='/leaderboard' element={<Leaderboard />} />
            <Route path='/shop' element={<Shop />} />
        </Routes>
    )
}

export default App
