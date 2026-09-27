import { useGLTF, Outlines } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'

// Generic loader for any placed building's .glb model - replaces the
// windmill-only WindMill.jsx now that a second building (water well) needs
// the exact same load/clone/center/hover/select/rotate behavior. Adding a
// third building later is just one new entry in GameWorld's model map, not
// a whole new component file.
function BuildingModel({ modelUrl, position = [0, 0, 0], rotationDeg = 0, scale = 0.01, selected = false, onSelect }) {
    const { scene } = useGLTF(modelUrl)
    const [hovered, setHovered] = useState(false)

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true)

        const box = new THREE.Box3().setFromObject(clone)
        const center = box.getCenter(new THREE.Vector3())

        clone.position.x -= center.x
        clone.position.z -= center.z
        clone.position.y -= box.min.y

        // Meshes loaded from a GLTF default to castShadow/receiveShadow
        // false - unlike the hand-built props in WorldProps.jsx, which set
        // these directly on each <mesh>, a loaded scene needs it done here.
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

export default BuildingModel
