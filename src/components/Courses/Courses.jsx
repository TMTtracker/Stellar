import './Courses.css';

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
                                <article className="course-card-grid" key={i}>
                                    <div className="course-card-image" style={{ background: course.bgGradient }}>
                                    </div>
                                    <div className="course-card-content">
                                        <div className="course-level">{course.level}</div>
                                        <h3>{course.title}</h3>
                                        <p className="course-instructor">{course.instructor}</p>
                                        
                                        <div className="course-stats">
                                            <span className="stat">📊 {course.students}</span>
                                            <span className="stat">💬 {course.comments}</span>
                                            <span className="stat">🔖 {course.saves}</span>
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
                            <span className="stat-icon">📄</span>
                            <span className="stat-value">26</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">🛡️</span>
                            <span className="stat-value">6</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">⭐</span>
                            <span className="stat-value">4</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">⏱️</span>
                            <span className="stat-value">23h</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">👥</span>
                            <span className="stat-value">128</span>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="calendar-section">
                        <div className="calendar-header">
                            <span className="nav-arrow">‹</span>
                            <h4>February 2022</h4>
                            <span className="nav-arrow">›</span>
                        </div>
                        <div className="calendar-grid">
                            <div className="cal-weekday">S</div>
                            <div className="cal-weekday">M</div>
                            <div className="cal-weekday">T</div>
                            <div className="cal-weekday">W</div>
                            <div className="cal-weekday">T</div>
                            <div className="cal-weekday">F</div>
                            <div className="cal-weekday">S</div>
                            
                            {[13, 14, 15, 16, 17, 18, 19].map(day => (
                                <div key={day} className={`cal-day ${day === 14 ? 'active' : ''}`}>
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="activity-section">
                        <div className="activity-header">
                            <h4>Your activity</h4>
                            <button className="activity-filter">Last week ▼</button>
                        </div>
                        <div className="activity-chart">
                            <svg viewBox="0 0 120 60" preserveAspectRatio="none">
                                <polyline points="0,50 15,35 30,40 45,25 60,30 75,15 90,20 105,10 120,25" 
                                    fill="none" stroke="#A8D79F" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            </svg>
                        </div>
                    </div>

                    {/* Upcoming Task */}
                    <div className="upcoming-section">
                        <div className="upcoming-header">
                            <h4>Upcoming Task</h4>
                            <a href="#" className="see-all-link">See All</a>
                        </div>
                        <div className="task-item">
                            <div className="task-icon" style={{ backgroundColor: '#FFB6C1' }}>🎨</div>
                            <div className="task-details">
                                <h5>3d Design Icon Section</h5>
                                <p>18 Feb 2022, Saturday</p>
                            </div>
                            <span className="task-arrow">›</span>
                        </div>
                        <div className="task-item">
                            <div className="task-icon" style={{ backgroundColor: '#FFD700' }}>📁</div>
                            <div className="task-details">
                                <h5>UI Styleguide Section</h5>
                                <p>18 Feb 2022, Saturday</p>
                            </div>
                            <span className="task-arrow">›</span>
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}

export default Courses;