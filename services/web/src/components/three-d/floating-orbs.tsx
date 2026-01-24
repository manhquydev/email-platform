/**
 * Floating Orbs Component
 * Decorative floating spheres with brand colors
 * Includes scroll-linked scale effects
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useWindowScroll } from './hooks/use-scroll-animation'

interface FloatingOrbsProps {
    /** Disable animations for reduced motion preference */
    reducedMotion?: boolean
    /** Enable scroll-linked animations */
    enableScrollAnimation?: boolean
}

export function FloatingOrbs({
    reducedMotion = false,
    enableScrollAnimation = false
}: FloatingOrbsProps) {
    const groupRef = useRef<THREE.Group>(null)
    // V3: Slower float speeds for eye comfort
    const floatSpeed = reducedMotion ? 0 : 1
    const floatSpeedSlow = reducedMotion ? 0 : 0.7
    const floatSpeedSlowest = reducedMotion ? 0 : 0.5

    // Track window scroll for parallax
    const scrollData = useWindowScroll()

    // Apply scroll-based scaling
    useFrame(() => {
        if (!enableScrollAnimation || !groupRef.current) return

        const progress = scrollData.progress
        // V3: Reduced scroll effect (1 → 0.8 at bottom)
        const scale = 1 - progress * 0.2
        groupRef.current.scale.setScalar(scale)

        // V3: Reduced vertical drift
        groupRef.current.position.y = -progress * 1
    })

    return (
        <group ref={groupRef}>
            {/* Primary violet orb - larger, top-left */}
            <Float speed={floatSpeed} rotationIntensity={0.3} floatIntensity={0.6}>
                <Sphere args={[0.5, 32, 32]} position={[-2, 1, -2]}>
                    <meshStandardMaterial
                        color="#8b5cf6"
                        emissive="#8b5cf6"
                        emissiveIntensity={0.5}
                        roughness={0.2}
                        metalness={0.6}
                        transparent
                        opacity={0.5}
                    />
                </Sphere>
            </Float>

            {/* Secondary purple orb - smaller, bottom-right */}
            <Float speed={floatSpeedSlow} rotationIntensity={0.2} floatIntensity={0.5}>
                <Sphere args={[0.3, 32, 32]} position={[2, -1, -1]}>
                    <meshStandardMaterial
                        color="#a855f7"
                        emissive="#a855f7"
                        emissiveIntensity={0.4}
                        roughness={0.3}
                        metalness={0.5}
                        transparent
                        opacity={0.4}
                    />
                </Sphere>
            </Float>

            {/* Tertiary cyan accent orb - subtle, center-back */}
            <Float speed={floatSpeedSlowest} rotationIntensity={0.1} floatIntensity={0.3}>
                <Sphere args={[0.2, 32, 32]} position={[0, 0.5, -3]}>
                    <meshStandardMaterial
                        color="#06b6d4"
                        emissive="#06b6d4"
                        emissiveIntensity={0.3}
                        roughness={0.4}
                        metalness={0.4}
                        transparent
                        opacity={0.3}
                    />
                </Sphere>
            </Float>
        </group>
    )
}
