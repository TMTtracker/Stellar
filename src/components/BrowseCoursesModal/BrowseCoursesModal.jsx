import { useEffect, useState } from "react";
import { X, BookOpen, Code, MessagesSquare, Clock, Lock } from "lucide-react";
import { listCourses } from "@/services/courses";
import "./BrowseCoursesModal.css";

const ICONS = { BookOpen, Code, MessagesSquare };
function courseIcon(name) {
    return ICONS[name] ?? BookOpen;
}

function useEscapeToClose(onClose) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);
}

/**
 * A read-only preview of the course catalog for signed-out visitors - shows
 * what's available, but never opens a course into its lessons/materials.
 * That stays gated behind sign up / log in, via the CTA bar at the bottom.
 */
function BrowseCoursesModal({ onClose, onAuth }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [closing, setClosing] = useState(false);
    const [entered, setEntered] = useState(false);

    useEscapeToClose(requestClose);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        let cancelled = false;
        listCourses()
            .then((rows) => { if (!cancelled) setCourses(rows); })
            .catch((e) => { if (!cancelled) setError(e.message ?? "Failed to load courses"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    function requestClose() {
        setClosing(true);
        setTimeout(onClose, 180);
    }

    const visible = entered && !closing;

    return (
        <div
            className="browsecourses-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) requestClose();
            }}
        >
            <div className={`browsecourses-backdrop ${visible ? "is-visible" : ""}`} />

            <div className={`browsecourses-card ${visible ? "is-visible" : ""}`}>
                <button className="browsecourses-close" onClick={requestClose} aria-label="Close">
                    <X size={18} />
                </button>

                <h2 className="browsecourses-title">Browse Courses</h2>
                <p className="browsecourses-subtitle">A quick look at what you'll be learning - sign up to open any of these.</p>

                <div className="browsecourses-grid">
                    {loading && <p className="browsecourses-status">Loading courses…</p>}
                    {!loading && error && <p className="browsecourses-status">{error}</p>}
                    {!loading && !error && courses.length === 0 && (
                        <p className="browsecourses-status">No courses published yet — check back soon.</p>
                    )}
                    {!loading && !error && courses.map((course) => {
                        const Icon = courseIcon(course.icon);
                        return (
                            <div key={course.id} className="browsecourses-item">
                                <div className="browsecourses-item-lock">
                                    <Lock size={12} /> Locked
                                </div>
                                <div className="browsecourses-item-icon" style={{ background: course.color ?? "#A9D8AE" }}>
                                    <Icon size={18} color="#fff" />
                                </div>
                                <span className="browsecourses-item-subject">{course.subject}</span>
                                <h3 className="browsecourses-item-title">{course.title}</h3>
                                {course.description && (
                                    <p className="browsecourses-item-desc">{course.description}</p>
                                )}
                                <div className="browsecourses-item-meta">
                                    <Clock size={13} /> {course.estimated_hours ? `${course.estimated_hours}h` : "—"}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="browsecourses-cta">
                    <button className="browsecourses-signup" onClick={() => onAuth("signup")}>
                        Sign Up to Enroll
                    </button>
                    <p className="browsecourses-login-row">
                        Already have an account?{" "}
                        <button className="browsecourses-login-link" onClick={() => onAuth("login")}>
                            Log in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default BrowseCoursesModal;
