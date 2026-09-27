import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen, Trophy, Users, Blocks, Rocket } from "lucide-react";
import "./IntroModal.css";

const STEPS = [
    {
        icon: BookOpen,
        title: "Learn at Your Pace",
        desc: "Dive into interactive courses and lessons built to teach real skills, one topic at a time.",
    },
    {
        icon: Trophy,
        title: "Climb the Leaderboard",
        desc: "Earn XP and coins as you finish lessons and quizzes, and see how you stack up against other learners.",
    },
    {
        icon: Users,
        title: "Join the Community",
        desc: "Ask questions, share your wins, and connect with other learners in the Stellar community feed.",
    },
    {
        icon: Blocks,
        title: "Build Your World",
        desc: "Spend what you earn on real building materials and watch your own world grow as you progress.",
    },
    {
        icon: Rocket,
        title: "Ready to Start?",
        desc: "Create your free account and take your first step into Stellar today.",
        isFinal: true,
    },
];

function useEscapeToClose(onClose) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);
}

function IntroModal({ onClose, onSignup }) {
    const [step, setStep] = useState(0);
    const [closing, setClosing] = useState(false);
    const [entered, setEntered] = useState(false);

    useEscapeToClose(requestClose);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    function requestClose() {
        setClosing(true);
        setTimeout(onClose, 180);
    }

    const visible = entered && !closing;
    const current = STEPS[step];
    const Icon = current.icon;
    const isFirst = step === 0;
    const isLast = step === STEPS.length - 1;

    return (
        <div
            className="intromodal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) requestClose();
            }}
        >
            <div className={`intromodal-backdrop ${visible ? "is-visible" : ""}`} />

            <div className={`intromodal-card ${visible ? "is-visible" : ""}`}>
                <button className="intromodal-close" onClick={requestClose} aria-label="Close">
                    <X size={18} />
                </button>

                <button
                    className="intromodal-nav intromodal-nav-left"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={isFirst}
                    aria-label="Previous"
                >
                    <ChevronLeft size={20} />
                </button>

                <button
                    className="intromodal-nav intromodal-nav-right"
                    onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    disabled={isLast}
                    aria-label="Next"
                >
                    <ChevronRight size={20} />
                </button>

                <div className="intromodal-body">
                    <div className="intromodal-icon">
                        <Icon size={28} />
                    </div>
                    <h2 className="intromodal-title">{current.title}</h2>
                    <p className="intromodal-desc">{current.desc}</p>
                </div>

                <div className="intromodal-dots">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            className={`intromodal-dot ${i === step ? "active" : ""}`}
                            onClick={() => setStep(i)}
                            aria-label={`Go to step ${i + 1}`}
                        />
                    ))}
                </div>

                {current.isFinal && (
                    <button className="intromodal-signup" onClick={onSignup}>
                        Sign Up
                    </button>
                )}
            </div>
        </div>
    );
}

export default IntroModal;
