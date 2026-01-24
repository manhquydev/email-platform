/**
 * Ephemeral Particles Component
 * Floating particles that rotate slowly, representing ephemeral data
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface EphemeralParticlesProps {
    /** Number of particles to render */
    count?: number
    /** Whether to animate the particles */
    animate?: boolean
}

export function EphemeralParticles({
    count = 500,
    animate = true
}: EphemeralParticlesProps) {
    const points = useRef<THREE.Points>(null)

    // Generate random positions for particles
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10
        }
        return pos
    }, [count])

    // Slow rotation animation
    useFrame((_, delta) => {
        if (points.current && animate) {
            points.current.rotation.y += delta * 0.05
        }
    })

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.02}
                color="#8b5cf6"
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    )
}
