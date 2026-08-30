import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid } from "@react-three/drei"
import Camp from "../HeroModel/Camp"
import { Building, GrassField, Tree } from "./WorldProps"

function GameWorld() {
    return (
        <div className='w-full h-full bg-[#effaf4]'>
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
            >
                <color attach='background' args={['#effaf4']} />

                <ambientLight intensity={1.8} />
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
                    position={[10, 20, 10]}
                    intensity={1.8}
                />

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

                <Camp />

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
        </div>
    )
}

export default GameWorld
