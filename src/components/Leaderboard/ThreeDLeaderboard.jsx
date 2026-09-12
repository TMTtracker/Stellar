import './ThreeDLeaderboard.css';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, Text, Billboard, Html } from '@react-three/drei';

const BLOCK_WIDTH = 1.05;
const BLOCK_DEPTH = 0.95;
const BLOCK_GAP = 0.26;

const PODIUM_LAYOUT = [
    { rankIndex: 1, x: -(BLOCK_WIDTH + BLOCK_GAP), height: 1.0, color: '#92C889' },
    { rankIndex: 0, x: 0, height: 1.4, color: '#7EC98A' },
    { rankIndex: 2, x: BLOCK_WIDTH + BLOCK_GAP, height: 0.75, color: '#A8D79F' },
];

function PodiumBlock({ user, x, height, color, onSelectUser }) {
    const topY = height / 2;

    // Live data may have < 3 profiles — skip empty slots instead of crashing.
    if (!user) return null;

    const displayName = user.name ?? 'Stellar Cadet';

    return (
        <group position={[x, 0, 0]}>
            {/* Plain box (no bevel) for crisp cube edges */}
            <mesh position={[0, topY, 0]} onClick={() => onSelectUser?.(user.id)}>
                <boxGeometry args={[BLOCK_WIDTH, height, BLOCK_DEPTH]} />
                <meshStandardMaterial color={color} />
            </mesh>

            <Billboard position={[0, topY, BLOCK_DEPTH / 2 + 0.16]}>
                <Text
                    fontSize={0.42}
                    color="#ffffff"
                    outlineWidth={0.012}
                    outlineColor="#5C9E5A"
                    anchorX="center"
                    anchorY="middle"
                >
                    {user.rank}
                </Text>
            </Billboard>

            <Html
                position={[0, height + 0.5, 0]}
                center
                zIndexRange={[10, 0]}
            >
                <div className="podium-avatar-wrap">
                    <span className="podium-avatar-name">{displayName.split(' ')[0]}</span>
                    <button
                        type="button"
                        className="podium-avatar"
                        onClick={() => onSelectUser?.(user.id)}
                        title={displayName}
                    >
                        <span>{user.avatar ?? displayName.slice(0, 1).toUpperCase()}</span>
                    </button>
                </div>
            </Html>
        </group>
    );
}

function ThreeDLeaderboard({ topThree = [], onSelectUser }) {
    return (
        <div className="podium-canvas-wrap">
            <Canvas
                orthographic
                camera={{
                    position: [-6, 4, 8],
                    zoom: 78,
                    near: 0.1,
                    far: 100,
                }}
                onCreated={({ camera, gl }) => {
                    camera.lookAt(0, 0.95, 0);
                    gl.setClearColor(0x000000, 0);
                }}
                gl={{ alpha: true }}
            >
                <ambientLight intensity={1.6} />
                <directionalLight position={[-4, 8, 6]} intensity={1.4} />

                <RoundedBox
                    args={[3.7, 0.22, 1.35]}
                    radius={0.08}
                    smoothness={4}
                    position={[0, -0.11, 0]}
                >
                    <meshStandardMaterial color="#DCEFD6" />
                </RoundedBox>

                {PODIUM_LAYOUT.map((slot) => (
                    <PodiumBlock
                        key={slot.rankIndex}
                        user={topThree[slot.rankIndex]}
                        x={slot.x}
                        height={slot.height}
                        color={slot.color}
                        onSelectUser={onSelectUser}
                    />
                ))}
            </Canvas>
        </div>
    );
}

export default ThreeDLeaderboard;
