import { useEffect, useState } from "react";
import {
    Home,
    Check,
    Lock,
    MonitorSmartphone,
    Flame,
    DoorClosed,
    X,
} from "lucide-react";

import "./CourseMaterial.css";

const chapters = [
    { name: "Chapter 1", status: "done" },
    { name: "Chapter 2", status: "done" },
    { name: "Chapter 3", status: "current" },
    { name: "Chapter 4", status: "upcoming" },
    { name: "Chapter 5", status: "upcoming" },
];

const keyConcepts = ["Main idea", "Supporting details", "Author's purpose", "Evidence"];

const rewards = [
    { name: "Window", icon: MonitorSmartphone, unlocked: true },
    { name: "Fence", icon: Flame, unlocked: true },
    { name: "Door", icon: DoorClosed, unlocked: false },
];

const question = {
    prompt: "What is the main idea of the passage?",
    options: [
        { id: "A", text: "Answer option A" },
        { id: "B", text: "Answer option B" },
        { id: "C", text: "Answer option C" },
        { id: "D", text: "Answer option D" },
    ],
};

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

function CourseMaterial({ course, onClose }) {
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [closing, setClosing] = useState(false);
    const [entered, setEntered] = useState(false);

    const completedChapters = chapters.filter((c) => c.status === "done").length;
    const totalChapters = chapters.length;

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

    return (
        <div
            className="cm-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    requestClose();
                }
            }}
        >
            <div className={`cm-backdrop ${visible ? "is-visible" : ""}`} />

            <div className={`cm-panel ${visible ? "is-visible" : ""}`}>
                <button className="cm-close" onClick={requestClose} aria-label="Close course material">
                    <X size={18} />
                </button>

                <div className="cm-main">
                    {/* Top bar */}
                    <header className="cm-topbar">
                        <div className="cm-topbar-left">
                            <div className="cm-title-block">
                                <p className="cm-brand">STELLAR</p>
                                <p className="cm-subtitle">{course?.title || "English Reading"}</p>
                            </div>
                        </div>
                        <div className="cm-percent-pill">68% Complete</div>
                    </header>

                    <div className="cm-content-grid">
                        {/* Left sidebar: chapter list */}
                        <aside className="cm-chapters">
                            <p className="cm-eyebrow">COURSE</p>
                            <ul className="cm-chapter-list">
                                {chapters.map((ch) => (
                                    <li key={ch.name} className="cm-chapter-item">
                                        {ch.status === "done" && (
                                            <span className="cm-status-dot cm-status-done">
                                                <Check size={12} className="cm-status-icon" strokeWidth={3} />
                                            </span>
                                        )}
                                        {ch.status === "current" && (
                                            <span className="cm-status-dot cm-status-current">
                                                <span className="cm-status-current-inner" />
                                            </span>
                                        )}
                                        {ch.status === "upcoming" && (
                                            <span className="cm-status-dot cm-status-upcoming">
                                                <span className="cm-status-upcoming-inner" />
                                            </span>
                                        )}
                                        <span
                                            className={
                                                ch.status === "current"
                                                    ? "cm-chapter-name is-current"
                                                    : ch.status === "upcoming"
                                                    ? "cm-chapter-name is-upcoming"
                                                    : "cm-chapter-name"
                                            }
                                        >
                                            {ch.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <p className="cm-eyebrow cm-eyebrow-progress">PROGRESS</p>
                            <div className="cm-progress-track">
                                <div
                                    className="cm-progress-fill"
                                    style={{ width: `${(completedChapters / totalChapters) * 100}%` }}
                                />
                            </div>
                            <p className="cm-progress-text">
                                {completedChapters} / {totalChapters}
                            </p>
                        </aside>

                        {/* Main content */}
                        <main className="cm-body">
                            <div>
                                <p className="cm-chapter-tag">CHAPTER 03</p>
                                <h1 className="cm-page-title">Reading Comprehension</h1>
                            </div>

                            <div className="cm-cards-row">
                                <div className="cm-card">
                                    <h3 className="cm-card-title">Summary</h3>
                                    <p className="cm-card-text">
                                        AI-generated summary of the material, distilled into the two or
                                        three sentences a student needs to reorient before diving into
                                        the questions.
                                    </p>
                                </div>
                                <div className="cm-card">
                                    <h3 className="cm-card-title">How to Solve</h3>
                                    <p className="cm-card-text">
                                        Step-by-step guidance for approaching this type of question -
                                        what to look for first, and how to eliminate answers that
                                        don&apos;t fit.
                                    </p>
                                </div>
                            </div>

                            <div className="cm-card cm-concepts-card">
                                <h3 className="cm-card-title cm-concepts-title">Key Concepts</h3>
                                <ul className="cm-concepts-list">
                                    {keyConcepts.map((concept) => (
                                        <li key={concept} className="cm-concept-item">
                                            <span className="cm-concept-dot" />
                                            {concept}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </main>

                        {/* Right sidebar */}
                        <aside className="cm-rewards">
                            <p className="cm-eyebrow">REWARDS</p>
                            <ul className="cm-rewards-list">
                                {rewards.map((r) => {
                                    const Icon = r.icon;
                                    return (
                                        <li key={r.name} className="cm-reward-item">
                                            <div className="cm-reward-left">
                                                <span className="cm-reward-icon">
                                                    <Icon size={14} />
                                                </span>
                                                <span className="cm-reward-name">{r.name}</span>
                                            </div>
                                            {r.unlocked ? (
                                                <Check size={14} className="cm-reward-unlocked" strokeWidth={3} />
                                            ) : (
                                                <Lock size={13} className="cm-reward-locked" />
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>

                            <p className="cm-eyebrow cm-eyebrow-world">YOUR WORLD</p>
                            <div className="cm-world-card">
                                <div className="cm-world-icon">
                                    <Home size={20} />
                                </div>
                                <p className="cm-world-level">Level 3</p>
                                <div className="cm-progress-track">
                                    <div className="cm-progress-fill" style={{ width: "68%" }} />
                                </div>
                                <p className="cm-world-percent">68%</p>
                            </div>
                        </aside>
                    </div>

                    {/* Quiz section */}
                    <section className="cm-quiz">
                        <div className="cm-quiz-inner">
                            <p className="cm-quiz-eyebrow">CHECK YOUR UNDERSTANDING</p>
                            <h2 className="cm-quiz-question">
                                Question 1: {question.prompt}
                            </h2>

                            <div className="cm-options-row">
                                {question.options.map((opt) => {
                                    const isSelected = selected === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => !submitted && setSelected(opt.id)}
                                            className={`cm-option-btn ${isSelected ? "is-selected" : ""}`}
                                        >
                                            <span className={`cm-option-badge ${isSelected ? "is-selected" : ""}`}>
                                                {opt.id}
                                            </span>
                                            {opt.text}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setSubmitted(true)}
                                disabled={!selected}
                                className="cm-submit-btn"
                            >
                                {submitted ? "Answer Submitted" : "Submit Answers"}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default CourseMaterial;
