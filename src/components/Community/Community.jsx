import './Community.css';
import { UserPlus, BookOpen, ListChecks, Award, Gift, Info, Heart } from 'lucide-react';

// Evenly spaced (dx = 225) icon centers along a 1080x400 viewBox. Each icon
// sits in the middle of a flat plateau, and the road jumps steeply between
// plateaus - a staircase shape rather than a smooth wave, per the sketch.
const VIEW_WIDTH = 1080;
const VIEW_HEIGHT = 400;

const roadSteps = [
    {
        id: 1,
        label: 'Join Us Now',
        step: 'Step 01',
        description: 'Sign up to learn and build.',
        icon: UserPlus,
        x: 90,
        y: 340,
    },
    {
        id: 2,
        label: 'Enroll Courses',
        step: 'Step 02',
        description: 'Enroll to a course that you like.',
        icon: BookOpen,
        x: 315,
        y: 170,
    },
    {
        id: 3,
        label: 'Complete Task',
        step: 'Step 03',
        description: 'Complete tasks to gain XP for each course to level up.',
        icon: ListChecks,
        x: 540,
        y: 340,
    },
    {
        id: 4,
        label: 'Earn Badge',
        step: 'Step 04',
        description: 'Earn badges to flex with your friends about your skill & accomplishment.',
        icon: Award,
        x: 765,
        y: 60,
    },
    {
        id: 5,
        label: 'Get Rewarded',
        step: 'Step 05',
        description: 'Get rewarded and level up your world with rewarding house components.',
        icon: Gift,
        x: 990,
        y: 190,
    },
];

// Floating markers off the road (not journey steps, so no "Step 0X" caption)
// - placed roughly where the sketch circled them: one before the road
// starts, one after it ends. About Us sits near the left edge, so its
// tooltip is left-anchored and opens rightward; Our Motivation sits near
// the right edge, so its tooltip is right-anchored and opens leftward -
// centering either would push a wide box off the page.
const infoMarkers = [
    {
        id: 'about',
        label: 'About Us',
        icon: Info,
        x: 20,
        y: 120,
        tooltipPosition: 'below',
        tooltipAlign: 'left',
        heading: 'About Us',
        paragraphs: [
            'Stellar is a gamified learning platform designed to make learning more engaging, interactive, and rewarding. Instead of simply completing lessons and quizzes, users progress through courses, complete learning tasks, and earn rewards that contribute to building their own 3D world. With AI-assisted summaries and automatically generated quizzes, Stellar helps users understand educational materials, practice what they learn, and track their progress. Every achievement has a visible impact, turning learning into a journey where you learn, achieve, and build.',
        ],
    },
    {
        id: 'motivation',
        label: 'Our Motivation',
        icon: Heart,
        x: 950,
        y: 340,
        tooltipPosition: 'above',
        tooltipAlign: 'right',
        heading: 'Our Motivation',
        paragraphs: [
            'Learning can be difficult when distractions constantly compete for our attention. Even when users have clear goals, it can be hard to stay consistent when progress feels slow or there is little sense of accomplishment.',
            'Our motivation behind Stellar is to help users turn that struggle into progress. We want every completed task to feel meaningful—not just as another lesson checked off, but as an achievement that contributes to something they can see and build. By rewarding users with progress, achievements, and pieces for their 3D world, Stellar gives them a reason to keep going.',
            'Our goal is simple: help users stay focused, celebrate their progress, and make every step of learning feel rewarding.',
        ],
    },
];

// One continuous bezier chain (no flat straight segments) through the 5
// icons, with a horizontal tangent at every icon so the road forms a
// rounded, circular-looking crest or dip right at each one - and pulled-in
// control points (0.35 of the evenly-spaced 225-unit gap) so it still bends
// sharply between icons, per the sketch.
const ROAD_PATH =
    'M90,340 C169,340 236,170 315,170 ' +
    'C394,170 461,340 540,340 ' +
    'C619,340 686,60 765,60 ' +
    'C844,60 911,190 990,190';

function Community() {
    return (
        <section className="community-section" id="community">
            <div className="community-container">
                <div className="community-banner">
                    <h1>Welcome to the Stellar Community</h1>
                    <p>Hover the icons along the path below to see how your journey unfolds - from joining to getting rewarded.</p>
                </div>

                <div className="community-road-wrapper">
                    <svg
                        className="community-road-svg"
                        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <path className="road-base" d={ROAD_PATH} />
                        <path className="road-dash" d={ROAD_PATH} />
                    </svg>

                    <div className="community-road-track" aria-hidden="true">
                        <span className="community-road-track-dash" />
                    </div>

                    {infoMarkers.map((marker) => {
                        const Icon = marker.icon;
                        return (
                            <div
                                className="road-stop info-marker"
                                key={marker.id}
                                style={{
                                    '--x': `${(marker.x / VIEW_WIDTH) * 100}%`,
                                    '--y': `${(marker.y / VIEW_HEIGHT) * 100}%`,
                                }}
                            >
                                <div
                                    className="road-stop-icon"
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`${marker.label} - more information`}
                                >
                                    <Icon size={22} strokeWidth={2.2} />
                                </div>

                                <span className="road-stop-label">{marker.label}</span>

                                <div
                                    className={`info-marker-tooltip pos-${marker.tooltipPosition} align-${marker.tooltipAlign}`}
                                    role="tooltip"
                                >
                                    <div className="info-tooltip-heading">
                                        <h2>{marker.heading}</h2>
                                    </div>
                                    <div className="info-tooltip-body">
                                        {marker.paragraphs.map((paragraph, i) => (
                                            <p key={i}>{paragraph}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {roadSteps.map((stepItem) => {
                        const Icon = stepItem.icon;
                        // Icons in the upper half of the curve have more room
                        // below them; icons in the lower half have more room
                        // above - so the tooltip never covers the icon.
                        const tooltipPosition = stepItem.y < VIEW_HEIGHT / 2 ? 'below' : 'above';
                        return (
                            <div
                                className="road-stop"
                                key={stepItem.id}
                                style={{
                                    '--x': `${(stepItem.x / VIEW_WIDTH) * 100}%`,
                                    '--y': `${(stepItem.y / VIEW_HEIGHT) * 100}%`,
                                }}
                            >
                                <div
                                    className="road-stop-icon"
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`${stepItem.step}: ${stepItem.description}`}
                                >
                                    <Icon size={22} strokeWidth={2.2} />
                                </div>

                                <span className="road-stop-label">{stepItem.label}</span>

                                <div className={`road-stop-tooltip pos-${tooltipPosition}`} role="tooltip">
                                    <strong>{stepItem.step}</strong>
                                    <p>{stepItem.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default Community;
