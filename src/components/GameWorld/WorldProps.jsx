import * as THREE from 'three'
import { useMemo } from 'react'

// ------------------------------------------------------------------
// Tree
// Low-poly tree: brown trunk + layered green cones of foliage.
// ------------------------------------------------------------------
export function Tree({ position = [0, 0, 0], scale = 1, trunkColor = '#7a5230', leafColor = '#3f8f46', variation = 0 }) {
    const seed = (variation * 999.17) % 1
    const leafShade = new THREE.Color(leafColor).offsetHSL(0, 0, (seed - 0.5) * 0.08)

    return (
        <group position={position} scale={[scale, scale, scale]}>
            {/* Trunk */}
            <mesh position={[0, 1.2, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.4, 2.4, 6]} />
                <meshStandardMaterial color={trunkColor} flatShading />
            </mesh>
            {/* Foliage layers */}
            <mesh position={[0, 3, 0]} castShadow>
                <coneGeometry args={[1.8, 2.6, 7]} />
                <meshStandardMaterial color={leafShade} flatShading />
            </mesh>
            <mesh position={[0, 4.2, 0]} castShadow>
                <coneGeometry args={[1.3, 2, 7]} />
                <meshStandardMaterial color={leafShade} flatShading />
            </mesh>
            <mesh position={[0, 5.1, 0]} castShadow>
                <coneGeometry args={[0.8, 1.4, 7]} />
                <meshStandardMaterial color={leafShade} flatShading />
            </mesh>
        </group>
    )
}

// ------------------------------------------------------------------
// Building
// Basic low-poly building: box body + flat/roof top + window planes.
// ------------------------------------------------------------------
export function Building({ position = [0, 0, 0], scale = 1, height = 5, width = 4, depth = 4, wallColor = '#d9c7b8', roofColor = '#a54a3f' }) {
    const windows = []
    const rows = Math.max(2, Math.round(height / 2))
    const cols = Math.max(1, Math.round(width / 2))

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const y = height / 2 - 1.5 - r * 2
            const x = -width / 2 + 1 + c * 2
            windows.push(
                <mesh key={`win-${r}-${c}`} position={[x, y, depth / 2 + 0.02]}>
                    <planeGeometry args={[0.8, 1.1]} />
                    <meshStandardMaterial color='#8fd3e8' emissive='#3a6b78' emissiveIntensity={0.2} />
                </mesh>
            )
        }
    }

    return (
        <group position={position} scale={[scale, scale, scale]}>
            <group position={[0, height / 2, 0]}>
                {/* Body */}
                <mesh position={[0, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={wallColor} flatShading />
                </mesh>
                {windows}
                {/* Roof */}
                <mesh position={[0, height / 2 + 0.35, 0]} castShadow>
                    <boxGeometry args={[width + 0.6, 0.7, depth + 0.6]} />
                    <meshStandardMaterial color={roofColor} flatShading />
                </mesh>
            </group>
        </group>
    )
}

// ------------------------------------------------------------------
// Grass
// A small cluster of grass blades. Spread in a field.
// ------------------------------------------------------------------
export function Grass({ position = [0, 0, 0], scale = 1, color = '#5aa353', blades = 5 }) {
    const blades_ = []
    for (let i = 0; i < blades; i++) {
        const angle = (i / blades) * Math.PI * 2
        const offset = 0.15 + ((i * 37) % 10) / 100
        const x = Math.cos(angle) * offset
        const z = Math.sin(angle) * offset
        const h = 0.5 + ((i * 53) % 10) / 25
        blades_.push(
            <mesh key={i} position={[x, h / 2, z]} rotation={[0, angle, 0]}>
                <coneGeometry args={[0.06, h, 3]} />
                <meshStandardMaterial color={color} flatShading side={THREE.DoubleSide} />
            </mesh>
        )
    }

    return <group position={position} scale={[scale, scale, scale]}>{blades_}</group>
}

// Deterministic PRNG so field layout is stable across re-renders
// (Math.random() is impure and must not run during render).
function mulberry32(seed) {
    let a = seed >>> 0
    return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ------------------------------------------------------------------
// GrassField
// Scatters many grass clumps across a square area.
// ------------------------------------------------------------------
export function GrassField({ size = 40, count = 400, color = '#5aa353' }) {
    const positions = useMemo(() => {
        const rand = mulberry32(size * 100003 + count * 1013)
        const out = []
        for (let i = 0; i < count; i++) {
            const x = (rand() - 0.5) * size
            const z = (rand() - 0.5) * size
            // skip area where camp sits
            if (Math.hypot(x, z) < 6) continue
            out.push({
                i,
                x,
                z,
                s: 0.9 + rand() * 0.5
            })
        }
        return out
    }, [size, count])

    return (
        <group>
            {positions.map(p => (
                <Grass key={p.i} position={[p.x, 0, p.z]} scale={p.s} color={color} blades={5} />
            ))}
        </group>
    )
}

export default { Tree, Building, Grass, GrassField }
