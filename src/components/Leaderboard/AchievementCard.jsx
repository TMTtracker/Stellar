import { Info } from 'lucide-react';
import { ICON_REGISTRY } from './leaderboardData';

const BADGE_COLORS = ['#4FD1C5', '#F6AD55', '#7C9CF0', '#F582AE', '#8FCB8C', '#F6E05E'];

function AchievementCard({ iconKey, level, caption, index = 0 }) {
    const Icon = ICON_REGISTRY[iconKey] ?? Info;
    const badgeColor = BADGE_COLORS[index % BADGE_COLORS.length];

    return (
        <div className="achievement-card">
            <span className="achievement-count-badge">{level}</span>
            <div className="achievement-icon-badge" style={{ backgroundColor: badgeColor }}>
                <Icon size={24} color="#ffffff" />
            </div>
            <div className="achievement-level-row">
                <h5>Level {level}</h5>
                <Info size={13} className="achievement-info-icon" />
            </div>
            <p>{caption}</p>
        </div>
    );
}

export default AchievementCard;
