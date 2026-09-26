import { useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, Sparkles } from "@react-three/drei"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Trash2 } from "lucide-react"
import Camp from "../HeroModel/Camp"
import { Building, GrassField, Tree } from "./WorldProps"
import BuildingModel from "./BuildingModel"
import { listMyBuildings, moveBuilding, rotateBuilding, removeBuilding, RESOURCES_EVENT } from "@/services/resources"
import { getMyBase, moveBase, rotateBase, BASE_EVENT } from "@/services/base"

import windMillModel from "../../assets/models/SM_Wind_mill.glb"
import waterWellModel from "../../assets/models/SM_Water_Well.glb"
import workspaceModel from "../../assets/models/SM_WorkSpace.glb"
import houseModel from "../../assets/models/SM_house.glb"
import houseLevel3Model from "../../assets/models/SM_House_level_3.glb"

// Which .glb model represents each build_menu id - any build_id not
// listed here simply doesn't render anything yet.
const BUILDING_MODEL_URLS = {
    data_structures_hall: windMillModel,
    algorithms_tower: waterWellModel,
    interview_prep_dojo: workspaceModel
}

// Which .glb model represents each base level (level 1 has no entry - it's
// always the hand-tuned <Camp/>, not a generic loaded model). Exported so
// Dashboard's upgrade modal can preview the same model.
export const BASE_MODEL_URLS = {
    2: houseModel,
    3: houseLevel3Model
}

// Placed buildings get spread out relative to this origin. Grid
// coordinates (pos_x/pos_y, small integers) are scaled here into real
// world-space spacing - one grid step = one MOVE_STEP. Grid (0,0), where
// every newly-placed building starts, sits just off the camp so it's
// immediately visible in the default camera framing instead of tucked in
// a corner you have to pan to find.
const PLACEMENT_ORIGIN = [4, 0, -6]
const MOVE_STEP = 4

// The base itself lives at its own origin (the camp's traditional spot),
// independent of PLACEMENT_ORIGIN which is only for other buildings.
const BASE_ORIGIN = [0, 0, 0]
const BASE_SELECTED_ID = 'base'

function toWorldPosition(b) {
    return [
        PLACEMENT_ORIGIN[0] + (b.pos_x ?? 0) * MOVE_STEP,
        0,
        PLACEMENT_ORIGIN[2] + (b.pos_y ?? 0) * MOVE_STEP
    ]
}

function toBaseWorldPosition(b) {
    return [
        BASE_ORIGIN[0] + (b.pos_x ?? 0) * MOVE_STEP,
        0,
        BASE_ORIGIN[2] + (b.pos_y ?? 0) * MOVE_STEP
    ]
}

function GameWorld({ dark = false }) {
    const [buildings, setBuildings] = useState([])
    // Defaults match a brand-new player's row exactly, so the camp renders
    // in the right spot immediately instead of popping in once the fetch
    // resolves.
    const [base, setBase] = useState({ base_level: 1, pos_x: 0, pos_y: 0, rotation: 0 })
    const [selectedId, setSelectedId] = useState(null)
    const [busy, setBusy] = useState(false)
    const [showUpgradeEffect, setShowUpgradeEffect] = useState(false)
    const prevBaseLevel = useRef(null)

    useEffect(() => {
        function load() {
            listMyBuildings().then(setBuildings).catch(() => {})
        }
        load()
        window.addEventListener(RESOURCES_EVENT, load)
        return () => window.removeEventListener(RESOURCES_EVENT, load)
    }, [])

    useEffect(() => {
        function loadBase() {
            getMyBase().then(row => {
                setBase(row)
                // Skip the very first load (prevBaseLevel still null) - the
                // sparkle burst is only for an actual upgrade just now, not
                // for simply opening/reloading the page on an existing base.
                if (prevBaseLevel.current != null && row.base_level > prevBaseLevel.current) {
                    setShowUpgradeEffect(true)
                    setTimeout(() => setShowUpgradeEffect(false), 2500)
                }
                prevBaseLevel.current = row.base_level
            }).catch(() => {})
        }
        loadBase()
        window.addEventListener(BASE_EVENT, loadBase)
        return () => window.removeEventListener(BASE_EVENT, loadBase)
    }, [])

    const isBaseSelected = selectedId === BASE_SELECTED_ID
    const selected = isBaseSelected ? base : (buildings.find(b => b.id === selectedId) ?? null)

    async function handleMove(dx, dy) {
        if (!selected || busy) return
        setBusy(true)
        try {
            const pos_x = (selected.pos_x ?? 0) + dx
            const pos_y = (selected.pos_y ?? 0) + dy
            if (isBaseSelected) {
                await moveBase({ pos_x, pos_y })
            } else {
                await moveBuilding(selected.id, { pos_x, pos_y })
            }
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
            const rotation = ((selected.rotation ?? 0) + 90) % 360
            if (isBaseSelected) {
                await rotateBase(rotation)
            } else {
                await rotateBuilding(selected.id, rotation)
            }
        } catch (e) {
            console.error('[gameworld] rotate failed:', e.message)
        } finally {
            setBusy(false)
        }
    }

    async function handleRemove() {
        if (!selected || busy || isBaseSelected) return
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
        <div className={`w-full h-full ${dark ? 'bg-[#0A0D1C]' : 'bg-[#effaf4]'}`}>
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
                {/* Night mode swaps only the lighting rig + background/fog to a
                    dim, cool moonlit look - no model or material changes. */}
                <color attach='background' args={[dark ? '#0A0D1C' : '#effaf4']} />
                {dark && <fog attach='fog' args={['#0A0D1C', 25, 95]} />}

                <ambientLight intensity={dark ? 0.32 : 1.8} color={dark ? '#4A5AA8' : '#ffffff'} />
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
                    position={dark ? [-14, 24, 8] : [10, 20, 10]}
                    intensity={dark ? 0.85 : 1.8}
                    color={dark ? '#AEBBFF' : '#ffffff'}
                />
                {/* Faint warm rim/fill so the night scene isn't purely cold blue -
                    mirrors the lantern-glow feel of the reference without adding
                    a light source tied to any specific model. */}
                {dark && <hemisphereLight args={['#3A4A8A', '#0A0D1C', 0.25]} />}

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

                {/* Home base - level 1 is always the hand-tuned camp; levels
                    2+ swap in the matching upgraded model. Selectable/movable
                    with the same tool as any other building (just never
                    removable). */}
                {base && (base.base_level <= 1 || !BASE_MODEL_URLS[base.base_level] ? (
                    <Camp
                        position={toBaseWorldPosition(base)}
                        rotationDeg={base.rotation ?? 0}
                        selected={isBaseSelected}
                        onSelect={() => setSelectedId(BASE_SELECTED_ID)}
                    />
                ) : (
                    <BuildingModel
                        modelUrl={BASE_MODEL_URLS[base.base_level]}
                        position={toBaseWorldPosition(base)}
                        rotationDeg={base.rotation ?? 0}
                        selected={isBaseSelected}
                        onSelect={() => setSelectedId(BASE_SELECTED_ID)}
                    />
                ))}

                {showUpgradeEffect && base && (
                    <Sparkles
                        position={toBaseWorldPosition(base)}
                        count={80}
                        scale={6}
                        size={6}
                        speed={0.6}
                        color='#A9D8AE'
                    />
                )}

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
                    const modelUrl = BUILDING_MODEL_URLS[b.build_id]
                    if (!modelUrl) return null
                    return (
                        <BuildingModel
                            key={b.id}
                            modelUrl={modelUrl}
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
                <div className='absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 dark:bg-[#14171A]/95 border border-[#C9DDC4] dark:border-[#262E28] rounded-2xl px-2 py-1.5 shadow-sm z-30'>
                    <button
                        aria-label='Move front'
                        disabled={busy}
                        onClick={() => handleMove(0, -1)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50'
                    >
                        <ArrowUp size={17} />
                    </button>
                    <button
                        aria-label='Move back'
                        disabled={busy}
                        onClick={() => handleMove(0, 1)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50'
                    >
                        <ArrowDown size={17} />
                    </button>
                    <button
                        aria-label='Move left'
                        disabled={busy}
                        onClick={() => handleMove(-1, 0)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50'
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <button
                        aria-label='Move right'
                        disabled={busy}
                        onClick={() => handleMove(1, 0)}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50'
                    >
                        <ArrowRight size={17} />
                    </button>
                    <span className='w-px h-6 bg-[#C9DDC4] dark:bg-[#262E28] mx-0.5' />
                    <button
                        aria-label='Rotate 90 degrees'
                        disabled={busy}
                        onClick={handleRotate}
                        className='w-9 h-9 flex items-center justify-center rounded-lg text-[#6A6F73] dark:text-[#8FA893] hover:bg-[#DDF0E1] dark:hover:bg-[#1E2B20] hover:text-[#1F2225] dark:hover:text-[#EAF3E7] disabled:opacity-50'
                    >
                        <RotateCw size={17} />
                    </button>
                    {!isBaseSelected && (
                        <>
                            <span className='w-px h-6 bg-[#C9DDC4] dark:bg-[#262E28] mx-0.5' />
                            <button
                                aria-label='Remove building'
                                disabled={busy}
                                onClick={handleRemove}
                                className='w-9 h-9 flex items-center justify-center rounded-lg text-[#C4634F] hover:bg-[#FBF1ED] dark:hover:bg-[#2A1716] disabled:opacity-50'
                            >
                                <Trash2 size={17} />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default GameWorld
