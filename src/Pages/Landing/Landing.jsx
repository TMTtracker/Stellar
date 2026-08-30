import './Landing.css'

import Sidebar from '../../components/Sidebar/Sidebar'
import Header from '../../components/Header/Header'
import Hero from '../../components/Hero/Hero'
import HeroModel from '../../components/HeroModel/HeroModel'
import Courses from '../../components/Courses/Courses'
import Leaderboard from '../../components/Leaderboard/Leaderboard'
import Community from '../../components/Community/Community'
import Profile from '../../components/Profile/Profile'
import { useState } from 'react' //for login and signup modal
import AuthModal from '../../components/AuthModal/AuthModal'

function Landing() {
    const [authMode, setAuthMode] = useState(null) // null | "login" | "signup"

    return (
        <div>
            <Sidebar />

            <Header openAuth={setAuthMode} onLoginClick={() => setAuthMode('login')} onSignupClick={() => setAuthMode('signup')} />

            <main className='flex flex-col px-15 ml-20'>
                <div className='hero-main'>
                    <Hero />

                    <HeroModel />
                </div>

                <Courses />

                <Leaderboard />

                <Community />

                <Profile />
            </main>
            {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />}
        </div>
    )
}

export default Landing
