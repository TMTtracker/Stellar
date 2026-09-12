import { useEffect, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid } from "@react-three/drei"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Trash2 } from "lucide-react"
import Camp from "../HeroModel/Camp"
import { Building, GrassField, Tree } from "./WorldProps"
import WindMill from "./WindMill"
import { listMyBuildings, moveBuilding, rotateBuilding, removeBuilding, RESOURCES_EVENT } from "@/services/resources"

// Which 3D model represents each build_menu id - only data_structures_hall
// has one so far (a test of the placement pipeline); any other build_id
// simply doesn't render anything yet.
const BUILDING_MODELS = {
    data_structures_hall: WindMill
}

// Placed buildings get spread out relative to this origin. Grid
// coordinates (pos_x/pos_y, small integers) are scaled here into real
// world-space spacing - one grid step = one MOVE_STEP. Grid (0,0), where
// every newly-placed building starts, sits just off the camp so it's
// immediately visible in the default camera framing instead of tucked in
// a corner you have to pan to find.
const PLACEMENT_ORIGIN = [4, 0, -6]
const MOVE_STEP = 4

function toWorldPosition(b) {
    return [
        PLACEMENT_ORIGIN[0] + (b.pos_x ?? 0) * MOVE_STEP,
        0,
        PLACEMENT_ORIGIN[2] + (b.pos_y ?? 0) * MOVE_STEP
    ]
}

function GameWorld() {
    const [buildings, setBuildings] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        function load() {
            listMyBuildings().then(setBuildings).catch(() => {})
        }
        load()
        window.addEventListener(RESOURCES_EVENT, load)
        return () => window.removeEventListener(RESOURCES_EVENT, load)
    }, [])

    const selected = buildings.find(b => b.id === selectedId) ?? null

    async function handleMove(dx, dy) {
        if (!selected || busy) return
        setBusy(true)
        try {
            await moveBuilding(selected.id, { pos_x: (selected.pos_x ?? 0) + dx, pos_y: (selected.pos_y ?? 0) + dy })
        } catch (e) {
            console.error('[gameworld] move failed:', e.message)
        } finally {
            setBusy(false)
        }
    }

    async function handleRotate() {
        if (!selected || busy) return
        setBusy(true)
        try {
            await rotateBuilding(selected.id, ((selected.rotation ?? 0) + 90) % 360)
        } catch (e) {
            console.error('[gameworld] rotate failed:', e.message)
        } finally {
            setBusy(false)
        }
    }

    async function handleRemove() {
        if (!selected || busy) return
        setBusy(true)
        try {
            await removeBuilding(selected.id)
            setSelectedId(null)
        } catch (e) {
            console.error('[gameworld] remove failed:', e.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className='w-full h-full bg-[#effaf4]'>
            <Canvas
                shadows
                orthographic
                camera={{
                    position: [18, 18, 18],
                    zoom: 40,
                    near: 0.1,
                    far: 1000,
                }}
                onCreated={({ camera }) => {
                    camera.lookAt(0, 0, 0)
                }}
                onPointerMissed={() => setSelectedId(null)}
            >
                <color attach='background' args={['#effaf4']} />

                <ambientLight intensity={1.8} />
                <directionalLight
                    ref={(l) => {
                        if (l) {
                            l.castShadow = true
                            l.shadow.mapSize.width = 2048
                            l.shadow.mapSize.height = 2048
                            const s = 40
                            l.shadow.camera.left = -s
                            l.shadow.camera.right = s
                            l.shadow.camera.top = s
                            l.shadow.camera.bottom = -s
                            l.shadow.camera.far = 80
                            l.shadow.bias = 0.0005
                        }
                    }}
                    position={[10, 20, 10]}
                    intensity={1.8}
                />

                {/* Green ground */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#7fb96a" flatShading />
                </mesh>

                <Grid
                    args={[50, 50]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor='#6f6f6f'
                    sectionSize={4}
                    sectionThickness={1}
                    sectionColor='#888888'
                    fadeDistance={120}
                    fadeStrength={8}
                    infiniteGrid={false}
                />

                <Camp />

                {/* Grass field */}
                <GrassField size={44} count={500} color="#5aa353" />

                {/* Trees scattered around the camp */}
                <Tree position={[-10, 0, -8]} scale={1.2} variation={1} />
                <Tree position={[-14, 0, 4]} scale={1.5} variation={2} />
                <Tree position={[12, 0, -10]} scale={1.3} variation={3} />
                <Tree position={[15, 0, 6]} scale={1.1} variation={4} />
                <Tree position={[-6, 0, 13]} scale={1.4} variation={5} />
                <Tree position={[7, 0, 14]} scale={1.2} variation={6} />
                <Tree position={[-16, 0, -12]} scale={1.6} variation={7} />
                <Tree position={[17, 0, -4]} scale={1.3} variation={8} />

                {/* Basic buildings in a small cluster */}
                <Building position={[-9, 0, 9]} width={5} height={6} depth={5} wallColor="#d9c7b8" roofColor="#a54a3f" />
                <Building position={[-3, 0, 12]} width={4} height={4.5} depth={4} wallColor="#cbb4a3" roofColor="#8a6a5a" />
                <Building position={[3, 0, 11]} width={6} height={7} depth={5} wallColor="#d9c7b8" roofColor="#5a6b7a" />

                {/* Player-placed buildings from user_building_positions */}
                {buildings.map(b => {
                    const Model = BUILDING_MODELS[b.build_id]
                    if (!Model) return null
                    return (
                        <Model
                            key={b.id}
                            position={toWorldPosition(b)}
                            rotationDeg={b.rotation ?? 0}
                            selected={b.id === selectedId}
                            onSelect={() => setSelectedId(b.id)}
                        />
                    )
                })}

                <OrbitControls
                    makeDefault
                    target={[0, 0, 0]}
                    enableRotate={false}
                    enablePan={true}
                    enableZoom={true}
                    minZoom={25}
                    maxZoom={50}
                />
            </Canvas>

            {/* Selected-building toolbar - front/back = -Z/+Z, left/right = -X/+X,
                each move/rotate snaps by exactly one grid step. */}
            {selected && (
                <div className='absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 border border-[#C9DDC4] rounded-2xl px-2 py-1.5 shadow-sm z-30'>
                    <button
                        aria-label='Move front'
                        disabled={busy}
                        onClick={() => handleMove(0, -1)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] hover:bg-[#DDF0E1] hover:text-[#1F2225] disabled:opacity-50'
                    >
                        <ArrowUp size={17} />
                    </button>
                    <button
                        aria-label='Move back'
                        disabled={busy}
                        onClick={() => handleMove(0, 1)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] hover:bg-[#DDF0E1] hover:text-[#1F2225] disabled:opacity-50'
                    >
                        <ArrowDown size={17} />
                    </button>
                    <button
                        aria-label='Move left'
                        disabled={busy}
                        onClick={() => handleMove(-1, 0)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] hover:bg-[#DDF0E1] hover:text-[#1F2225] disabled:opacity-50'
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <button
                        aria-label='Move right'
                        disabled={busy}
                        onClick={() => handleMove(1, 0)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] hover:bg-[#DDF0E1] hover:text-[#1F2225] disabled:opacity-50'
                    >
                        <ArrowRight size={17} />
                    </button>
                    <span className='w-px h-6 bg-[#C9DDC4] mx-0.5' />
                    <button
                        aria-label='Rotate 90 degrees'
                        disabled={busy}
                        onClick={handleRotate}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] hover:bg-[#DDF0E1] hover:text-[#1F2225] disabled:opacity-50'
                    >
                        <RotateCw size={17} />
                    </button>
                    <span className='w-px h-6 bg-[#C9DDC4] mx-0.5' />
                    <button
                        aria-label='Remove building'
                        disabled={busy}
                        onClick={handleRemove}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#C4634F] hover:bg-[#FBF1ED] disabled:opacity-50'
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            )}
        </div>
    )
}

export default GameWorld
