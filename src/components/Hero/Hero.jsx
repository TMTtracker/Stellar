import "./Hero.css";

function Hero() {
    return (

        <section className="hero" id="home">

            <h1 className="hero-title">
                STELLAR
            </h1>

            <p className="hero-description">
                Boost your dopamine levels and enhance your skills through
                engaging courses, rewarding challenges, and an interactive
                learning community. Level up your knowledge while watching
                your world grow.
            </p>

            <div className="hero-buttons">

                <button className="primary-btn">
                    Get Started
                </button>

                <button className="secondary-btn">
                    Browse Courses
                </button>

            </div>

        </section>

    );
}

export default Hero;