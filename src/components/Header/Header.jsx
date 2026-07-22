import "./Header.css";

function Header() {
    return (
        <header className="header">

            <div className="header-left">
                {/* Reserved for future */}
            </div>

            <div className="header-right">

                <button className="login-btn">
                    Log In
                </button>

                <button className="signup-btn">
                    Sign Up
                </button>

            </div>

        </header>
    );
}

export default Header;