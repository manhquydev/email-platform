/**
 * Canvas Test Component
 * Validates R3F installation works with React 19
 */
import { Canvas } from '@react-three/fiber'

export function CanvasTest() {
    return (
        <div className="w-full h-64 bg-black/50 rounded-lg overflow-hidden">
            <Canvas>
                <ambientLight intensity={0.5} />
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#8b5cf6" />
                </mesh>
            </Canvas>
        </div>
    )
}
