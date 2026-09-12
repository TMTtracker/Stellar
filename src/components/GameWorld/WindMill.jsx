import { useGLTF, Outlines } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'

import windMillModel from '../../assets/models/SM_Wind_mill.glb'

// Mirrors Camp.jsx's load/clone/center pattern, but as a reusable,
// positionable, interactive component - Camp only ever renders once at
// the origin, this renders once per placed building instance (each needs
// its own clone since a single Object3D can't live at two positions).
function WindMill({ position = [0, 0, 0], rotationDeg = 0, scale = 0.01, selected = false, onSelect }) {
    const { scene } = useGLTF(windMillModel)
    const [hovered, setHovered] = useState(false)

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true)

        const box = new THREE.Box3().setFromObject(clone)
        const center = box.getCenter(new THREE.Vector3())

        clone.position.x -= center.x
        clone.position.z -= center.z
        clone.position.y -= box.min.y

        return clone
    }, [scene])

    return (
        <group
            position={position}
            scale={scale}
            rotation={[0, THREE.MathUtils.degToRad(rotationDeg), 0]}
            onPointerOver={(e) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
            }}
            onPointerOut={(e) => {
                e.stopPropagation()
                setHovered(false)
                document.body.style.cursor = 'auto'
            }}
            onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
            }}
        >
            <primitive object={clonedScene} />
            {(hovered || selected) && <Outlines thickness={4} color={selected ? '#2FA84F' : '#7BE495'} />}
        </group>
    )
}

export default WindMill
