import { useState, useMemo, useEffect } from 'react';
import './Courses.css';
import { GraduationCap, BookOpenCheck, Award, Clock, Users, Library, CheckCircle2 } from 'lucide-react';
import CourseMaterial from './CourseMaterial';

const coursesData = [
    {
        title: 'UI Vektor Illustration Design',
        level: 'Beginner',
        instructor: 'Samantha Nguyen',
        students: 74,
        comments: 9,
        saves: 86,
        progress: 45,
        bgGradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    },
    {
        title: 'UI Styleguide with Figma',
        level: 'Intermediate',
        instructor: 'Albert Flores',
        students: 25,
        comments: 10,
        saves: 124,
        progress: 75,
        bgGradient: 'linear-gradient(135deg, #4158D0 0%, #C850C0 100%)',
    },
    {
        title: 'Mastering Blender 3D Design',
        level: 'Master',
        instructor: 'Ronald Richards',
        students: 30,
        comments: 10,
        saves: 98,
        progress: 20,
        bgGradient: 'linear-gradient(135deg, #F97316 0%, #FCD34D 100%)',
    },
];

const instructorsData = [
    {
        name: 'Cameron Williamson',
        role: 'Design Course',
        avatar: '👨',
        bgColor: '#FFE66D',
    },
    {
        name: 'Kathryn Murphy',
        role: 'Design Course',
        avatar: '👩',
        bgColor: '#A8D79F',
    },
    {
        name: 'Jane Cooper',
        role: 'Design Course',
        avatar: '👩',
        bgColor: '#FFE66D',
    },
    {
        name: 'Theresa Webb',
        role: 'Design Course',
        avatar: '👩',
        bgColor: '#A8D79F',
    },
];

function Courses() {
    const [activeCourse, setActiveCourse] = useState(null);
    const [viewDate, setViewDate] = useState(() => new Date());
    const [now, setNow] = useState(() => new Date());
    const [activityRange, setActivityRange] = useState('week'); // 'week' | 'month'

    // real-time tick: re-render every minute so calendar + activity stay in sync
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(id);
    }, []);
    const isToday = (day) => {
        return (
            day !== null &&
            viewDate.getFullYear() === now.getFullYear() &&
            viewDate.getMonth() === now.getMonth() &&
            day === now.getDate()
        );
    };

    const monthLabel = useMemo(() => {
        return viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }, [viewDate]);

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
        const cells = [];
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        // pad trailing to complete last week row
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [viewDate]);

    const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const goToday = () => setViewDate(new Date());

    // ---- Real-time Your Activity data ----
    const activityData = useMemo(() => {
        // generate pseudo-random but time-based values so chart feels live
        // seed with date + minute so it updates every minute subtly
        const seedBase = now.getFullYear() * 10000 + now.getMonth() * 100 + now.getDate();
        const minuteTick = Math.floor(now.getHours() * 60 + now.getMinutes());
        const seeded = (i) => {
            const x = Math.sin(seedBase * 0.001 + i * 1.7 + minuteTick * 0.01) * 10000;
            return x - Math.floor(x);
        };
        if (activityRange === 'week') {
            // last 7 days including today
            return Array.from({ length: 7 }, (_, idx) => {
                const d = new Date(now);
                d.setDate(now.getDate() - (6 - idx));
                const base = 18 + seeded(idx) * 42; // 18-60
                // slightly boost today
                const boost = idx === 6 ? 6 : 0;
                return {
                    label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
                    fullLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    value: Math.round(Math.min(60, base + boost)),
                };
            });
        }
        // month -> last 4 weeks / 8 points (twice per week)
        return Array.from({ length: 8 }, (_, idx) => {
            const base = 22 + seeded(idx + 10) * 38;
            return {
                label: `W${idx + 1}`,
                fullLabel: `Week ${idx + 1}`,
                value: Math.round(base),
            };
        });
    }, [activityRange, now]);

    const activityPoints = useMemo(() => {
        const vals = activityData.map(d => d.value);
        const max = 60;
        const w = 120;
        const h = 60;
        const pad = 4;
        return vals.map((v, i) => {
            const x = (i / (vals.length - 1)) * w;
            const y = h - pad - (v / max) * (h - 18);
            return `${x},${y}`;
        }).join(' ');
    }, [activityData]);

    const activityAreaPoints = useMemo(() => {
        if (!activityPoints) return '';
        return `0,60 ${activityPoints} 120,60`;
    }, [activityPoints]);

    const activityTotal = useMemo(() => activityData.reduce((a, b) => a + b.value, 0), [activityData]);
    const activityAvg = useMemo(() => Math.round(activityTotal / (activityData.length || 1)), [activityTotal, activityData]);

    // ---- Upcoming tasks as course-like objects (click opens CourseMaterial) ----
    const upcomingTasks = useMemo(() => {
        const mkDate = (offset) => {
            const d = new Date(now);
            d.setDate(now.getDate() + offset);
            return d;
        };
        return [
            {
                id: 'task-3d',
                title: '3d Design Icon Section',
                icon: '🎨',
                bg: '#FFB6C1',
                date: mkDate(1),
                level: 'Master',
                instructor: 'Ronald Richards',
                students: 30,
                comments: 10,
                saves: 98,
                progress: 20,
                bgGradient: 'linear-gradient(135deg, #F97316 0%, #FCD34D 100%)',
            },
            {
                id: 'task-styleguide',
                title: 'UI Styleguide Section',
                icon: '📁',
                bg: '#FFD700',
                date: mkDate(3),
                level: 'Intermediate',
                instructor: 'Albert Flores',
                students: 25,
                comments: 10,
                saves: 124,
                progress: 75,
                bgGradient: 'linear-gradient(135deg, #4158D0 0%, #C850C0 100%)',
            },
        ];
    }, [now]);

    return (
        <section className="courses-section" id="courses">
            <div className="courses-container">
                {/* Left side - Courses and Instructors */}
                <div className="courses-content">
                    {/* Courses */}
                    <div className="courses-block">
                        <div className="section-header">
                            <div className="header-left-group">
                                <h2>Courses</h2>
                                <div className="search-box">
                                    <input type="text" placeholder="Search anything here..." />
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                </div>
                            </div>
                            <a href="#" className="see-all-link">All Courses</a>
                        </div>

                        <div className="courses-grid-3col">
                            {coursesData.map((course, i) => (
                                <article
                                    className="course-card-grid"
                                    key={i}
                                    onClick={() => setActiveCourse(course)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActiveCourse(course);
                                        }
                                    }}
                                >
                                    <div className="course-card-image" style={{ background: course.bgGradient }}>
                                    </div>
                                    <div className="course-card-content">
                                        <div className="course-level">{course.level}</div>
                                        <h3>{course.title}</h3>
                                        <p className="course-instructor">{course.instructor}</p>
                                        
                                        <div className="course-stats">
                                            <span className="stat"><Library size={14} /> {course.students}</span>
                                            <span className="stat"><Award size={14} /> {course.comments}</span>
                                            <span className="stat"><CheckCircle2 size={14} /> {course.saves}</span>
                                        </div>

                                        <div className="course-progress-bar">
                                            <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                                        </div>
                                        <span className="progress-text">{course.progress}%</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    {/* Instructors */}
                    <div className="instructors-block">
                        <div className="section-header">
                            <h2>Instructors</h2>
                            <a href="#" className="see-all-link">See All</a>
                        </div>

                        <div className="instructors-grid-2x2">
                            {instructorsData.map((instructor, i) => (
                                <div className="instructor-card-item" key={i}>
                                    <div className="instructor-avatar-large" style={{ backgroundColor: instructor.bgColor }}>
                                        <span className="avatar-emoji">{instructor.avatar}</span>
                                    </div>
                                    <h4>{instructor.name}</h4>
                                    <p>{instructor.role}</p>
                                    <button className="instructor-course-btn">Course</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side - Profile Panel */}
                <aside className="right-panel">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="profile-image">
                            <div className="profile-avatar">👩</div>
                            <div className="profile-badge">✓</div>
                        </div>
                        <div className="profile-info">
                            <h3>Esther Howard</h3>
                            <p>UX Designer</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="stats-row">
                        <div className="stat-item">
                            <GraduationCap className="stat-icon" size={20} />
                            <span className="stat-value">26</span>
                        </div>
                        <div className="stat-item">
                            <BookOpenCheck className="stat-icon" size={20} />
                            <span className="stat-value">6</span>
                        </div>
                        <div className="stat-item">
                            <Award className="stat-icon" size={20} />
                            <span className="stat-value">4</span>
                        </div>
                        <div className="stat-item">
                            <Clock className="stat-icon" size={20} />
                            <span className="stat-value">23h</span>
                        </div>
                        <div className="stat-item">
                            <Users className="stat-icon" size={20} />
                            <span className="stat-value">128</span>
                        </div>
                    </div>

                    {/* Calendar - real time */}
                    <div className="calendar-section">
                        <div className="calendar-header">
                            <button className="nav-arrow" onClick={goPrevMonth} aria-label="Previous month">‹</button>
                            <h4>{monthLabel}</h4>
                            <button className="nav-arrow" onClick={goNextMonth} aria-label="Next month">›</button>
                        </div>
                        <div className="calendar-grid">
                            <div className="cal-weekday">S</div>
                            <div className="cal-weekday">M</div>
                            <div className="cal-weekday">T</div>
                            <div className="cal-weekday">W</div>
                            <div className="cal-weekday">T</div>
                            <div className="cal-weekday">F</div>
                            <div className="cal-weekday">S</div>

                            {calendarDays.map((day, idx) =>
                                day === null ? (
                                    <div key={`empty-${idx}`} className="cal-day empty" />
                                ) : (
                                    <div key={day} className={`cal-day ${isToday(day) ? 'active' : ''}`} title={isToday(day) ? 'Today' : undefined}>
                                        {day}
                                    </div>
                                )
                            )}
                        </div>
                        <button
                            onClick={goToday}
                            style={{
                                marginTop: 8,
                                width: '100%',
                                padding: '6px',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'white',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#6A6F73',
                                cursor: 'pointer',
                            }}
                        >
                            Today: {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </button>
                    </div>

                    {/* Activity - real time */}
                    <div className="activity-section">
                        <div className="activity-header">
                            <h4>Your activity</h4>
                            <button
                                className="activity-filter"
                                onClick={() => setActivityRange(r => r === 'week' ? 'month' : 'week')}
                                aria-label="Toggle activity range"
                                title="Toggle between Last week / Last month"
                            >
                                {activityRange === 'week' ? 'Last week ▼' : 'Last month ▼'}
                            </button>
                        </div>
                        <div className="activity-chart">
                            <svg viewBox="0 0 120 60" preserveAspectRatio="none" role="img" aria-label="Activity chart">
                                <polygon points={activityAreaPoints} fill="rgba(168,215,159,0.18)" stroke="none" />
                                <polyline
                                    points={activityPoints}
                                    fill="none"
                                    stroke="#A8D79F"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {activityData.map((pt, i) => {
                                    const vals = activityData.map(d => d.value);
                                    const x = (i / (vals.length - 1)) * 120;
                                    const y = 60 - 4 - (pt.value / 60) * (60 - 18);
                                    return <circle key={i} cx={x} cy={y} r="1.8" fill="#A8D79F" stroke="white" strokeWidth="0.6" />;
                                })}
                            </svg>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#6A6F73', fontWeight: 600 }}>
                            {activityData.map((pt) => (
                                <span key={pt.label + pt.fullLabel} title={`${pt.fullLabel}: ${pt.value} pts`}>{pt.label}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#6A6F73' }}>
                            <span>Live • {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span style={{ marginLeft: 'auto' }}>Avg <b style={{ color: '#1F2225' }}>{activityAvg}</b></span>
                            <span>Total <b style={{ color: '#1F2225' }}>{activityTotal}</b></span>
                        </div>
                    </div>

                    {/* Upcoming Task - real time, click opens CourseMaterial like course cards */}
                    <div className="upcoming-section">
                        <div className="upcoming-header">
                            <h4>Upcoming Task</h4>
                            <a href="#" className="see-all-link">See All</a>
                        </div>
                        {upcomingTasks.map((task) => {
                            const label = task.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'long' });
                            return (
                                <div
                                    className="task-item"
                                    key={task.id}
                                    onClick={() => setActiveCourse(task)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActiveCourse(task);
                                        }
                                    }}
                                    title={`Open ${task.title}`}
                                >
                                    <div className="task-icon" style={{ backgroundColor: task.bg }}>{task.icon}</div>
                                    <div className="task-details">
                                        <h5>{task.title}</h5>
                                        <p>{label}</p>
                                    </div>
                                    <span className="task-arrow">›</span>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>

            {activeCourse && (
                <CourseMaterial course={activeCourse} onClose={() => setActiveCourse(null)} />
            )}
        </section>
    );
}

export default Courses
