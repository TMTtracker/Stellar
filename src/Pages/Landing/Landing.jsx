import "./Landing.css";

import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";
import Hero from "../../components/Hero/Hero";
import HeroModel from "../../components/HeroModel/HeroModel";
import Courses from "../../components/Courses/Courses";
import Leaderboard from "../../components/Leaderboard/Leaderboard";
import Community from "../../components/Community/Community";
import Profile from "../../components/Profile/Profile";

function Landing() {
    return (
        <div className="landing-page">

            <Sidebar />

            <Header />

            <main className="landing-main">

                <Hero />

                <HeroModel />

            </main>
            <Courses />

            <Leaderboard />

            <Community />

            <Profile />


        </div>
    );
}

export default Landing;