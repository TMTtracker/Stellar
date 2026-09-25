import './Landing.css';

import { useState } from 'react'; //for login and signup modal
import AuthModal from '../../components/AuthModal/AuthModal';
import BrowseCoursesModal from '../../components/BrowseCoursesModal/BrowseCoursesModal';
import Community from '../../components/Community/Community';
import Header from '../../components/Header/Header';
import Hero from '../../components/Hero/Hero';
import HeroModel from '../../components/HeroModel/HeroModel';
import IntroModal from '../../components/IntroModal/IntroModal';
import { LeaderboardContent } from '../../components/Leaderboard/Leaderboard';
import Profile from '../../components/Profile/Profile';
import Sidebar from '../../components/Sidebar/Sidebar';

// Courses is intentionally not rendered on the landing page for now (kept as
// its own disconnected component/route, not deleted) - the marketing page
// was getting cluttered, and the mock data there doesn't reflect real
// course content yet.

function Landing() {
    const [authMode, setAuthMode] = useState(null) // null | "login" | "signup"
    const [showIntro, setShowIntro] = useState(false)
    const [showBrowse, setShowBrowse] = useState(false)

    return (
        <div>
            <Sidebar />

            <Header openAuth={setAuthMode} onLoginClick={() => setAuthMode('login')} onSignupClick={() => setAuthMode('signup')} />

            <main className='flex flex-col px-15 ml-20'>
                <div className='hero-main'>
                    <Hero onGetStarted={() => setShowIntro(true)} onBrowseCourses={() => setShowBrowse(true)} />

                    <HeroModel />
                </div>

                <div className='landing-leaderboard-wrap'>
                    <LeaderboardContent />
                </div>

                <Community />

                <div className='landing-profile-wrap'>
                    <Profile />
                </div>
            </main>
            {showIntro && (
                <IntroModal
                    onClose={() => setShowIntro(false)}
                    onSignup={() => { setShowIntro(false); setAuthMode('signup'); }}
                />
            )}
            {showBrowse && (
                <BrowseCoursesModal
                    onClose={() => setShowBrowse(false)}
                    onAuth={(mode) => { setShowBrowse(false); setAuthMode(mode); }}
                />
            )}
            {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />}
        </div>
    )
}

export default Landing
