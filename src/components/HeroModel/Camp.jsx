import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import campModel from '../../assets/models/SM_Camp.glb'

function Camp() {
    const { scene } = useGLTF(campModel)

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true)

        const box = new THREE.Box3().setFromObject(clone)
        const center = box.getCenter(new THREE.Vector3())

        clone.position.x -= center.x
        clone.position.z -= center.z
        clone.position.y -= box.min.y

        return clone
    }, [scene])

    return <primitive object={clonedScene} scale={0.01} />
}

export default Camp
