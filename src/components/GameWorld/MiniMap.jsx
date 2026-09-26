import { useEffect, useState } from 'react'
import { useBase } from '@/hooks/useBase'
import { listMyBuildings, RESOURCES_EVENT } from '@/services/resources'

// Same grid math as GameWorld.jsx (kept in sync manually - both read the
// same pos_x/pos_y grid coordinates, just projected to 2D here instead of
// a real Three.js scene, so there's no second 3D render to pay for).
const MOVE_STEP = 4
const PLACEMENT_ORIGIN = [4, -6]
const BASE_ORIGIN = [0, 0]

const BUILD_TYPE_COLORS = {
    data_structures_hall: '#E8933E',
    algorithms_tower: '#6BA6D6',
    interview_prep_dojo: '#C97FD1'
}
const DEFAULT_BUILDING_COLOR = '#EFE6D8'
const BASE_COLOR = '#D9605B'

const MAP_SIZE = 132
const WORLD_HALF = 20 // world units visible from center to edge
const MARGIN = 10 // px kept clear at the map's edge

function worldToMap(x, z) {
    return [
        MAP_SIZE / 2 + (x / WORLD_HALF) * (MAP_SIZE / 2 - MARGIN),
        MAP_SIZE / 2 + (z / WORLD_HALF) * (MAP_SIZE / 2 - MARGIN)
    ]
}

/**
 * A real, live minimap - plots the actual camp/base and every placed
 * building at their real grid positions (same data GameWorld reads), as
 * flat 2D dots on an SVG rather than a second 3D camera, so it stays cheap
 * regardless of how large the world gets.
 */
function MiniMap() {
    const base = useBase()
    const [buildings, setBuildings] = useState([])

    useEffect(() => {
        function load() {
            listMyBuildings().then(setBuildings).catch(() => {})
        }
        load()
        window.addEventListener(RESOURCES_EVENT, load)
        return () => window.removeEventListener(RESOURCES_EVENT, load)
    }, [])

    const [baseX, baseZ] = worldToMap(
        BASE_ORIGIN[0] + (base.pos_x ?? 0) * MOVE_STEP,
        BASE_ORIGIN[1] + (base.pos_y ?? 0) * MOVE_STEP
    )

    return (
        <svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} className='rounded-lg block'>
            <rect width={MAP_SIZE} height={MAP_SIZE} fill='#7fb96a' />
            {[1, 2, 3, 4, 5].map(i => (
                <line key={`v${i}`} x1={i * (MAP_SIZE / 6)} y1={0} x2={i * (MAP_SIZE / 6)} y2={MAP_SIZE} stroke='#6f9f5f' strokeWidth={0.5} />
            ))}
            {[1, 2, 3, 4, 5].map(i => (
                <line key={`h${i}`} x1={0} y1={i * (MAP_SIZE / 6)} x2={MAP_SIZE} y2={i * (MAP_SIZE / 6)} stroke='#6f9f5f' strokeWidth={0.5} />
            ))}

            {buildings.map(b => {
                const [x, z] = worldToMap(
                    PLACEMENT_ORIGIN[0] + (b.pos_x ?? 0) * MOVE_STEP,
                    PLACEMENT_ORIGIN[1] + (b.pos_y ?? 0) * MOVE_STEP
                )
                return (
                    <rect
                        key={b.id}
                        x={x - 4} y={z - 4} width={8} height={8} rx={2}
                        fill={BUILD_TYPE_COLORS[b.build_id] ?? DEFAULT_BUILDING_COLOR}
                        stroke='white' strokeWidth={0.75}
                    />
                )
            })}

            {/* Base/camp - drawn last so it's always on top of any overlap */}
            <rect x={baseX - 5} y={baseZ - 5} width={10} height={10} rx={2} fill={BASE_COLOR} stroke='white' strokeWidth={1} />

            <text x={MAP_SIZE - 10} y={11} fontSize={9} fontWeight='bold' fill='white' textAnchor='middle'>N</text>
        </svg>
    )
}

export default MiniMap
