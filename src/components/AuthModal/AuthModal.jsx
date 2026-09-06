import logo from "../../assets/icons/logo-icon.svg";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import "./AuthModal.css";

const GREEN = "#8FCB8C";
const GREEN_DARK = "#78B975";

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

      <input {...props} className="authmodal-input" required={props.required ?? true} />
    </div>
  );
}

function AuthModal({ mode = "login", onClose, onSwitch }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn({ email: email.trim(), password });
      } else {
        const { user, session } = await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        });
        // If email confirmation is enabled, there will be no session yet
        if (user && !session) {
          setInfo("Check your email to confirm your account, then log in.");
          setSubmitting(false);
          return;
        }
      }
      requestClose();
      // Navigate after close animation
      setTimeout(() => navigate("/dashboard"), 190);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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

        <form className="authmodal-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <Field
              icon={User}
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          )}

          <Field
            icon={Mail}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Field
            icon={Lock}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          {!isLogin && (
            <Field
              icon={Lock}
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}

          {error && <p className="authmodal-error">{error}</p>}
          {info && <p className="authmodal-info">{info}</p>}

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
            disabled={submitting}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = GREEN_DARK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GREEN;
            }}
          >
            {submitting ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}

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
