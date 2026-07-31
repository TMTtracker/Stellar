import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

import campModel from "../../assets/models/SM_Camp.glb";

function Camp() {

    const { scene } = useGLTF(campModel);

    useEffect(() => {

        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());

        scene.position.sub(center);

    }, [scene]);

    return (
        <primitive
            object={scene}
            scale={0.01}
        />
    );
}

export default Camp;