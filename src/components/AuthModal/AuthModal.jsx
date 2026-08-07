import logo from "../../assets/icons/logo-icon.svg";
import { useState, useEffect } from "react";
import { X, Mail, Lock, User, ArrowRight } from "lucide-react";

import "./AuthModal.css";

const GREEN = "#8FCB8C";
const GREEN_DARK = "#78B975";
const INK = "#1F2422";

function useEscapeToClose(onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="authmodal-field">
      <span className="authmodal-field-icon">
        <Icon size={17} />
      </span>

      <input {...props} className="authmodal-input" />
    </div>
  );
}

function AuthModal({ mode = "login", onClose, onSwitch }) {
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);

  useEscapeToClose(requestClose);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEntered(true);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  function requestClose() {
    setClosing(true);

    setTimeout(() => {
      onClose();
    }, 180);
  }

  const visible = entered && !closing;
  const isLogin = mode === "login";

  return (
    <div
      className="authmodal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          requestClose();
        }
      }}
    >
      <div className={`authmodal-backdrop ${visible ? "is-visible" : ""}`} />

      <div className={`authmodal-card ${visible ? "is-visible" : ""}`}>
        <button className="authmodal-close" onClick={requestClose}>
          <X size={18} />
        </button>

        <div className="authmodal-badge">
          <img src={logo} alt="Stellar Logo" />
        </div>

        <h2 className="authmodal-title">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        <p className="authmodal-subtitle">
          {isLogin
            ? "Log in to pick up where you left off."
            : "Start a course, finish a task, watch your world grow."}
        </p>

        <form className="authmodal-form" onSubmit={(e) => e.preventDefault()}>
          {!isLogin && (
            <Field icon={User} type="text" placeholder="Full name" />
          )}

          <Field icon={Mail} type="email" placeholder="Email" />

          <Field icon={Lock} type="password" placeholder="Password" />

          {!isLogin && (
            <Field icon={Lock} type="password" placeholder="Confirm password" />
          )}

          {isLogin && (
            <div className="authmodal-forgot-row">
              <button type="button" className="authmodal-link-muted">
                Forgot Password?
              </button>
            </div>
          )}

          <button
            className="authmodal-submit"
            type="submit"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = GREEN_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GREEN;
            }}
          >
            {isLogin ? "Log In" : "Sign Up"}

            <ArrowRight size={15} />
          </button>
        </form>

        <p className="authmodal-switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="authmodal-switch-btn"
            onClick={() => onSwitch(isLogin ? "signup" : "login")}
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
