import "./Sidebar.css";
import logo from "../../assets/icons/logo-icon.svg";
import {
  House,
  BookOpen,
  Trophy,
  Users,
  User,
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";

function Sidebar() {

  const [active, setActive] = useState("home");
  const isSnapping = useRef(false);
  const activeRef = useRef("home");

   const scrollToSection = (id) => {

    if (isSnapping.current) return;

    isSnapping.current = true;

    setActive(id);

    document.getElementById(id)?.scrollIntoView({

        behavior: "smooth",
        block: "start"

    });

    setTimeout(() => {

        isSnapping.current = false;

    }, 300);

};

    useEffect(() => {
      activeRef.current = active;

    const sections = [
        "home",
        "courses",
        "leaderboard",
        "community",
        "profile"
    ];

    const observer = new IntersectionObserver(

        (entries) => {

            if (isSnapping.current) return;

            entries.forEach((entry) => {

                if (!entry.isIntersecting) return;

                if (entry.intersectionRatio < 0.20) return;
                if (activeRef.current === entry.target.id) return;

                isSnapping.current = true;

                setActive(entry.target.id);

                entry.target.scrollIntoView({

                    behavior: "smooth",
                    block: "start"

                });

                setTimeout(() => {

                    isSnapping.current = false;

                }, 250);

            });

        }, 

        {

            threshold: [0, 0.2, 0.25, 0.30, 0.45, 0.5, 0.60, 0.75, 1]

        }

    );

    sections.forEach((id) => {

        const section = document.getElementById(id);

        if (section) observer.observe(section);

    });

    return () => observer.disconnect();

}, [active]);

    


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