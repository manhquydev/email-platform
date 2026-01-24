/**
 * Ephemeral Particles Component
 * Floating particles with mouse repulsion "privacy shield" effect
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMouseRepulsion } from './hooks/use-mouse-repulsion'

interface EphemeralParticlesProps {
    /** Number of particles to render */
    count?: number
    /** Whether to animate the particles */
    animate?: boolean
    /** Enable mouse repulsion effect (disable on mobile) */
    enableMouseInteraction?: boolean
}

export function EphemeralParticles({
    count = 500,
    animate = true,
    enableMouseInteraction = true
}: EphemeralParticlesProps) {
    const points = useRef<THREE.Points>(null)
    const bufferRef = useRef<THREE.BufferAttribute>(null)

    // Generate random positions for particles (original positions for drift-back)
    const originalPositions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10
        }
        return pos
    }, [count])

    // Working positions (will be modified by mouse interaction)
    const positions = useMemo(() => {
        return new Float32Array(originalPositions)
    }, [originalPositions])

    // Velocities for smooth movement (pre-allocated, no GC)
    const velocities = useRef<Float32Array>(new Float32Array(count * 3).fill(0))

    // Original positions ref for drift-back
    const originalPosRef = useRef(originalPositions)

    // Apply mouse repulsion effect (pass points ref for coordinate transformation)
    useMouseRepulsion(
        bufferRef,
        velocities,
        originalPosRef,
        count,
        points,
        {
            radius: 2,
            strength: 0.015,
            damping: 0.92,
            returnStrength: 0.008,
            enabled: enableMouseInteraction
        }
    )

    // Slow rotation animation (independent of mouse interaction)
    useFrame((_, delta) => {
        if (points.current && animate) {
            points.current.rotation.y += delta * 0.05
        }
    })

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    ref={bufferRef}
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
