import { useGLTF, Outlines } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'

import campModel from '../../assets/models/SM_Camp.glb'

// position/rotationDeg/selected/onSelect are all optional so the marketing
// landing page's bare <Camp /> (HeroModel.jsx) keeps working exactly as
// before - only GameWorld's interactive usage passes them.
function Camp({ position = [0, 0, 0], rotationDeg = 0, selected = false, onSelect }) {
    const { scene } = useGLTF(campModel)
    const [hovered, setHovered] = useState(false)

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true)

        // Scale must be applied BEFORE measuring the box - position and
        // scale live on this same object, and an object's own scale does
        // NOT shrink its own position offset. Measuring the unscaled box
        // (e.g. min.y = -7.63) and then setting position.y = 7.63 on an
        // object that's ALSO scaled by 0.01 leaves the full 7.63 lift in
        // place while the geometry shrinks 100x under it - which is
        // exactly why this was floating ~7.5 units above the ground.
        clone.scale.setScalar(0.01)

        const box = new THREE.Box3().setFromObject(clone)
        const center = box.getCenter(new THREE.Vector3())

        clone.position.x -= center.x
        clone.position.z -= center.z
        clone.position.y -= box.min.y

        // Meshes loaded from a GLTF default to castShadow/receiveShadow
        // false - has to be set explicitly for the loaded scene to
        // participate in the shadow map like the hand-built props do.
        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        return clone
    }, [scene])

    return (
        <group
            position={position}
            rotation={[0, THREE.MathUtils.degToRad(rotationDeg), 0]}
            onPointerOver={onSelect ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' } : undefined}
            onPointerOut={onSelect ? (e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto' } : undefined}
            onClick={onSelect ? (e) => { e.stopPropagation(); onSelect() } : undefined}
        >
            <primitive object={clonedScene} />
            {(hovered || selected) && <Outlines thickness={4} color={selected ? '#2FA84F' : '#7BE495'} />}
        </group>
    )
}

export default Camp
