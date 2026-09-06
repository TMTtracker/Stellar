import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function Header({ openAuth }) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        try {
            await signOut();
            navigate("/");
        } catch (e) {
            console.error("[auth] sign out failed:", e.message);
        }
    }

    return (
        <header className="header">

            <div className="header-left">
                {/* Reserved for future */}
            </div>

            <div className="header-right">
                {user ? (
                    <>
                        <button className="login-btn" onClick={() => navigate("/dashboard")}>
                            Dashboard
                        </button>

                        <button className="signup-btn" onClick={handleLogout}>
                            Log Out
                        </button>
                    </>
                ) : (
                    <>
                        <button className="login-btn"
                        onClick={() => openAuth("login")}>
                            Log In
                        </button>

                        <button className="signup-btn"
                        onClick={() => openAuth("signup")}>
                            Sign Up
                        </button>
                    </>
                )}

            </div>

        </header>
    );
}

export default Header;
