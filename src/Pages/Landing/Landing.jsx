import "./Landing.css";

import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";
import Hero from "../../components/Hero/Hero";
import HeroModel from "../../components/HeroModel/HeroModel";

function Landing() {
    return (
        <div className="landing-page">

            <Sidebar />

            <Header />

            <main className="landing-main">

                <Hero />

                <HeroModel />

            </main>

        </div>
    );
}

export default Landing;