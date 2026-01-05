import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';

interface PlayerModelProps {
    modelPath?: string;
}

function PlayerModel({ modelPath = '/player-model.glb' }: PlayerModelProps) {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef<any>();

    return (
        <primitive
            ref={modelRef}
            object={scene}
            scale={1.8}
            position={[0, -1.8, 0]}
            rotation={[0, 0.3, 0]}
        />
    );
}

interface Avatar3DProps {
    modelPath?: string;
    className?: string;
}

export const Avatar3D = ({ modelPath, className = '' }: Avatar3DProps) => {
    return (
        <div className={`w-full h-full ${className}`}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 35 }}
                style={{ background: 'transparent' }}
            >
                <Suspense fallback={null}>
                    {/* Lighting */}
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
                    <pointLight position={[-5, 5, -5]} intensity={0.5} />

                    {/* Environment for reflections */}
                    <Environment preset="city" />

                    {/* 3D Model */}
                    <PlayerModel modelPath={modelPath} />

                    {/* Shadow */}
                    <ContactShadows
                        position={[0, -1.8, 0]}
                        opacity={0.7}
                        scale={8}
                        blur={2}
                    />

                    {/* Controls - allows rotation */}
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        minPolarAngle={Math.PI / 3}
                        maxPolarAngle={Math.PI / 2}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
};

// Preload the model
useGLTF.preload('/player-model.glb');
