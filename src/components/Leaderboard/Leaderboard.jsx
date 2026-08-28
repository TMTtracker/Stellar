import { useState } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import ThreeDLeaderboard from './ThreeDLeaderboard';
import AchievementCard from './AchievementCard';
import CourseRow from './CourseRow';
import DetailModal from './DetailModal';
import { leaderboardData } from './leaderboardData';
import './Leaderboard.css';

const sortedByRank = [...leaderboardData].sort((a, b) => a.rank - b.rank);
const topThree = sortedByRank.slice(0, 3);

const MEDAL_LABELS = { 1: 'rank-gold', 2: 'rank-silver', 3: 'rank-bronze' };
const ACHIEVEMENTS_VISIBLE = 2;
const COURSES_VISIBLE = 3;

function Leaderboard() {
    const [selectedUserId, setSelectedUserId] = useState(topThree[0].id);
    const [modalType, setModalType] = useState(null); // null | 'achievements' | 'courses'

    const selectedUser = sortedByRank.find((u) => u.id === selectedUserId) ?? topThree[0];

    return (
        <section className="leaderboard-section" id="leaderboard">
            <div className="leaderboard-container">
                {/* Left side - Podium + Intro, Ranked List */}
                <div className="leaderboard-content">
                    <div className="leaderboard-podium-frame">
                        <div className="leaderboard-podium-visual">
                            <ThreeDLeaderboard topThree={topThree} onSelectUser={setSelectedUserId} />
                        </div>

                        <div className="leaderboard-intro">
                            <h1>Grind &amp; Build</h1>
                            <p>
                                See how you stack up against other learners. Earn points by
                                completing tasks, climb the leaderboard, and keep grinding to build
                                your way to the top.
                            </p>
                        </div>
                    </div>

                    <div className="leaderboard-list-block">
                        <div className="section-header">
                            <h2>Leaderboard</h2>
                            <span className="leaderboard-count">{sortedByRank.length} learners</span>
                        </div>

                        <div className="leaderboard-list leaderboard-scroll">
                            {sortedByRank.map((user) => {
                                const isPositive = user.deltaFromLastMonth >= 0;
                                const DeltaIcon = isPositive ? TrendingUp : TrendingDown;

                                return (
                                    <button
                                        type="button"
                                        key={user.id}
                                        className={`leaderboard-row ${user.id === selectedUserId ? 'active' : ''}`}
                                        onClick={() => setSelectedUserId(user.id)}
                                    >
                                        {user.rank <= 3 ? (
                                            <span className={`leaderboard-rank-medal ${MEDAL_LABELS[user.rank]}`}>
                                                {user.rank}
                                            </span>
                                        ) : (
                                            <span className="leaderboard-rank">{user.rank}</span>
                                        )}
                                        <span className="leaderboard-row-avatar">{user.avatar}</span>
                                        <span className="leaderboard-row-info">
                                            <strong>{user.name}</strong>
                                            <small>Level {user.level}</small>
                                        </span>
                                        <span className={`leaderboard-delta ${isPositive ? 'positive' : 'negative'}`}>
                                            <DeltaIcon size={13} />
                                            {Math.abs(user.deltaFromLastMonth)} from last month
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right side - Selected User Detail Panel */}
                <aside className="leaderboard-detail-panel">
                    <div className="leaderboard-user-header">
                        <span className="leaderboard-user-avatar">{selectedUser.avatar}</span>
                        <div>
                            <h3>{selectedUser.name}</h3>
                            <div className="leaderboard-level-stars">
                                <span className="level-pill">Level {selectedUser.level}</span>
                                {Array.from({ length: selectedUser.level }).map((_, i) => (
                                    <Star key={i} size={14} color="#F6C445" fill="#F6C445" />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="leaderboard-categories">
                        <h4>Achiever in other categories</h4>
                        <div className="category-pills">
                            {selectedUser.categories.map((category) => (
                                <span className="category-pill" key={category}>{category}</span>
                            ))}
                        </div>
                    </div>

                    <div className="leaderboard-achievements-block">
                        <div className="section-header">
                            <h4>Achievements</h4>
                            {selectedUser.achievements.length > ACHIEVEMENTS_VISIBLE && (
                                <button
                                    type="button"
                                    className="see-all-link"
                                    onClick={() => setModalType('achievements')}
                                >
                                    Show All
                                </button>
                            )}
                        </div>

                        <div className="achievements-fixed-box">
                            <div className="achievement-cards-grid">
                                {selectedUser.achievements.slice(0, ACHIEVEMENTS_VISIBLE).map((achievement, i) => (
                                    <AchievementCard
                                        key={achievement.id}
                                        iconKey={achievement.iconKey}
                                        level={achievement.level}
                                        caption={achievement.caption}
                                        index={i}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="leaderboard-courses-block">
                        <div className="section-header">
                            <h4>Courses Enrolled</h4>
                            {selectedUser.courses.length > COURSES_VISIBLE && (
                                <button
                                    type="button"
                                    className="see-all-link"
                                    onClick={() => setModalType('courses')}
                                >
                                    Show All
                                </button>
                            )}
                        </div>

                        <div className="courses-fixed-box">
                            <div className="course-list">
                                {selectedUser.courses.slice(0, COURSES_VISIBLE).map((course) => (
                                    <CourseRow key={course.id} title={course.title} progress={course.progress} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="leaderboard-progress-block">
                        <span className="progress-block-label">Progression</span>
                        <div className="section-header">
                            <h4>Level {selectedUser.level}</h4>
                        </div>
                        <div className="lb-progress-bar">
                            <div
                                className="lb-progress-fill"
                                style={{ width: `${selectedUser.levelProgress}%` }}
                            />
                        </div>
                        <span className="lb-progress-text">{selectedUser.levelProgress}% completed</span>
                    </div>
                </aside>
            </div>

            {modalType === 'achievements' && (
                <DetailModal
                    avatar={selectedUser.avatar}
                    name={selectedUser.name}
                    label="All Achievements"
                    onClose={() => setModalType(null)}
                >
                    <div className="achievement-cards-grid">
                        {selectedUser.achievements.map((achievement, i) => (
                            <AchievementCard
                                key={achievement.id}
                                iconKey={achievement.iconKey}
                                level={achievement.level}
                                caption={achievement.caption}
                                index={i}
                            />
                        ))}
                    </div>
                </DetailModal>
            )}

            {modalType === 'courses' && (
                <DetailModal
                    avatar={selectedUser.avatar}
                    name={selectedUser.name}
                    label="Enrolled Courses"
                    onClose={() => setModalType(null)}
                >
                    <div className="course-list">
                        {selectedUser.courses.map((course) => (
                            <CourseRow key={course.id} title={course.title} progress={course.progress} />
                        ))}
                    </div>
                </DetailModal>
            )}
        </section>
    );
}

export default Leaderboard;
