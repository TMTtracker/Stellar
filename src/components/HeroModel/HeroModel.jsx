import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Grid } from "@react-three/drei";
import Camp from "./Camp";

function HeroModel() {

    return (

        <section className="hero-model">

            <div className="model-container">

                <Canvas

                style={{
                width: "100%",
                height: "100%"
                
               
                
                    }}

               orthographic
                    camera={{
                        position: [18, 18, 18],
                        zoom: 50,
                        near: 0.1,
                        far: 1000,
                    }}
                    onCreated={({ camera }) => {
                        camera.lookAt(0, 0, 0);
                    }}
                >

                <color attach="background" args={["#effaf4"]} />

                <ambientLight intensity={2} />

                <directionalLight
                position={[10,20,10]}
                intensity={2}
                />

               <Grid
                            args={[50, 50]}
                            cellSize={1}
                            cellThickness={0.5}
                            cellColor="#6f6f6f"
                            sectionSize={4}
                            sectionThickness={1}
                            sectionColor="#888888"
                            fadeDistance={120}
                            fadeStrength={8}
                            infiniteGrid={false}
                                    />  

                               

               

                <Camp />

                <OrbitControls
                               makeDefault
                               target={[0,0,0]}
                         
                            enableRotate={false}
                            enablePan={true}
                            enableZoom={true}
                            minZoom={25}
                            maxZoom={50}

                />

                </Canvas>

            </div>

        </section>

    );

}

export default HeroModel;