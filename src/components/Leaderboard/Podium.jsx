import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, RoundedBox, Text, OrbitControls, Plane } from '@react-three/drei'

// --- One podium block ---
function Block({ position, size, color, label }) {
    const [w, h, d] = size
    return (
        <group position={position}>
            <RoundedBox args={[w, h, d]} radius={0.04} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
            </RoundedBox>

            {/* Number on top face */}
            <Text position={[0, 0, d / 2 + 0.02]} rotation={[0, 0, 0]} fontSize={w * 0.8} color='#444' anchorX='center' anchorY='middle'>
                {label}
            </Text>
        </group>
    )
}

export default function Podium() {
    return (
        <Canvas
            shadows
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                height: 'auto',
                width: '40%',
                background: '#EFFAF4'
            }}
        >
            {/* Isometric-style orthographic camera */}
            <OrthographicCamera makeDefault position={[-40, 16, 50]} zoom={90} near={0.1} far={100} />

            {/* 2. Added OrbitControls right below the camera */}
            {/* target={[0, 0.75, 0]} focuses the camera movement on the center of your tallest block */}
            <OrbitControls enableDamping target={[0, 1, 0]} />

            {/* Lighting: soft ambient + one directional key light for the gradient shading */}
            <ambientLight intensity={1} />
            <directionalLight position={[4, 8, 4]} intensity={5} castShadow shadow-mapSize={[1024, 1024]} />

            {/* 1st place - center, tallest */}
            <Block position={[0, 1.1, 0]} size={[1.2, 2.2, 1.2]} color='#a2d2ff' label='1' />

            {/* 2nd place - left, medium */}
            <Block position={[-1.11, 0.75, 0]} size={[1, 1.5, 1]} color='#ffafcc' label='2' />

            {/* 3rd place - right, shortest */}
            <Block position={[1.11, 0.6, 0]} size={[1, 1.2, 1]} color='#ffe66d' label='3' />

            <Plane args={[50, 50]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                {/* <meshStandardMaterial color={"#effaf4"} roughness={0} metalness={0.05} /> */}
                <shadowMaterial transparent opacity={0.2} />
            </Plane>
        </Canvas>
    )
}
