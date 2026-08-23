import "./Sidebar.css";
import logo from "../../assets/icons/logo-icon.svg";
import {
  House,
  BookOpen,
  Trophy,
  Users,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const SECTION_IDS = ["home", "courses", "leaderboard", "community", "profile"];

function Sidebar() {

  const [active, setActive] = useState("home");
  const isNavigating = useRef(false);

  const scrollToSection = (id) => {

    isNavigating.current = true;
    setActive(id);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const release = () => {
      isNavigating.current = false;
    };

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", release, { once: true });
    } else {
      setTimeout(release, 800);
    }
  };

  useEffect(() => {

    const observer = new IntersectionObserver(
      (entries) => {

        if (isNavigating.current) return;

        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          setActive((prev) => (prev === mostVisible.target.id ? prev : mostVisible.target.id));
        }

      },
      { threshold: [0.2, 0.35, 0.5, 0.65, 0.8] }
    );

    SECTION_IDS.forEach((id) => {

      const section = document.getElementById(id);

      if (section) observer.observe(section);

    });

    return () => observer.disconnect();

  }, []);

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <img src={logo} alt="Stellar Logo" />
      </div>

      <nav className="sidebar-nav">

    <button onClick={() => scrollToSection("home")} className={`nav-button ${active === "home" ? "active" : ""}`}>
        <House size={22}/>
        <span className="tooltip">Home</span>
    </button>

    <button onClick={() => scrollToSection("courses")} className={`nav-button ${active === "courses" ? "active" : ""}`} >
        <BookOpen size={22}/>
        <span className="tooltip">Courses</span>
    </button>

    <button onClick={() => scrollToSection("leaderboard")} className={`nav-button ${active === "leaderboard" ? "active" : ""}`} >
        <Trophy size={22}/>
        <span className="tooltip">Leaderboard</span>
    </button>

    <button onClick={() => scrollToSection("community")} className={`nav-button ${active === "community" ? "active" : ""}`} >
        <Users size={22}/>
        <span className="tooltip">Community</span>
    </button>

    <button onClick={() => scrollToSection("profile")} className={`nav-button ${active === "profile" ? "active" : ""}`} >
        <User size={22}/>
        <span className="tooltip">Profile</span>
    </button>

</nav>

    </aside>
  );
}

export default Sidebar;
