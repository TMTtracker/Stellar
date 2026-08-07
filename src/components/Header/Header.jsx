import "./Header.css";

function Header({ openAuth }) {
    return (
        <header className="header">

            <div className="header-left">
                {/* Reserved for future */}
            </div>

            <div className="header-right">

                <button className="login-btn"
                className="login-btn"
                onClick={() => openAuth("login")}>
                    Log In
                </button>

                <button className="signup-btn"
                onClick={() => openAuth("signup")}>
                    Sign Up
                </button>

            </div>

        </header>
    );
}

export default Header;
