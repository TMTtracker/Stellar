import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import campModel from '../../assets/models/SM_Camp.glb'

function Camp() {
    const { scene } = useGLTF(campModel)

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

    return <primitive object={clonedScene} />
}

export default Camp
