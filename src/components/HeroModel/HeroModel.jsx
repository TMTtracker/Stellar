import "./HeroModel.css";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import Camp from "./Camp";

function HeroModel() {
    return (

        <section className="hero-model">

            <div className="model-container">

                <Canvas
                    camera={{
                        position: [0, 2, 6],
                        fov: 45,
                    }}
                >

                    <ambientLight intensity={2} />

                    <directionalLight
                        position={[5, 10, 5]}
                        intensity={3}
                    />

                    <Camp />

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                    />

                </Canvas>

            </div>

        </section>

    );
}

export default HeroModel;