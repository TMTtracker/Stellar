import "./Sidebar.css";
import logo from "../../assets/icons/logo-icon.svg";
import {
  House,
  BookOpen,
  Trophy,
  Users,
  User,
} from "lucide-react";

function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <img src={logo} alt="Stellar Logo" />
      </div>

      <nav className="sidebar-nav">

    <button className="nav-button active" >
        <House size={22}/>
        <span className="tooltip">Home</span>
    </button>

    <button className="nav-button" >
        <BookOpen size={22}/>
        <span className="tooltip">Courses</span>
    </button>

    <button className="nav-button" >
        <Trophy size={22}/>
        <span className="tooltip">Leaderboard</span>
    </button>

    <button className="nav-button" >
        <Users size={22}/>
        <span className="tooltip">Community</span>
    </button>

    <button className="nav-button" >
        <User size={22}/>
        <span className="tooltip">Profile</span>
    </button>

</nav>

    </aside>
  );
}

export default Sidebar;