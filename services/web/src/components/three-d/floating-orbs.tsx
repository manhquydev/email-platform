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
    const floatSpeed = reducedMotion ? 0 : 2
    const floatSpeedSlow = reducedMotion ? 0 : 1.5
    const floatSpeedSlowest = reducedMotion ? 0 : 1

    // Track window scroll for parallax
    const scrollData = useWindowScroll()

    // Apply scroll-based scaling
    useFrame(() => {
        if (!enableScrollAnimation || !groupRef.current) return

        const progress = scrollData.progress
        // Scale down orbs as user scrolls (1 → 0.6 at bottom)
        const scale = 1 - progress * 0.4
        groupRef.current.scale.setScalar(scale)

        // Slight vertical drift
        groupRef.current.position.y = -progress * 2
    })

    return (
        <group ref={groupRef}>
            {/* Primary violet orb - larger, top-left */}
            <Float speed={floatSpeed} rotationIntensity={0.5} floatIntensity={1}>
                <Sphere args={[0.5, 32, 32]} position={[-2, 1, -2]}>
                    <meshStandardMaterial
                        color="#8b5cf6"
                        emissive="#8b5cf6"
                        emissiveIntensity={1.2}
                        roughness={0.1}
                        metalness={0.8}
                        transparent
                        opacity={0.7}
                    />
                </Sphere>
            </Float>

            {/* Secondary purple orb - smaller, bottom-right */}
            <Float speed={floatSpeedSlow} rotationIntensity={0.3} floatIntensity={0.8}>
                <Sphere args={[0.3, 32, 32]} position={[2, -1, -1]}>
                    <meshStandardMaterial
                        color="#a855f7"
                        emissive="#a855f7"
                        emissiveIntensity={1.0}
                        roughness={0.2}
                        metalness={0.6}
                        transparent
                        opacity={0.5}
                    />
                </Sphere>
            </Float>

            {/* Tertiary cyan accent orb - subtle, center-back */}
            <Float speed={floatSpeedSlowest} rotationIntensity={0.2} floatIntensity={0.5}>
                <Sphere args={[0.2, 32, 32]} position={[0, 0.5, -3]}>
                    <meshStandardMaterial
                        color="#06b6d4"
                        emissive="#06b6d4"
                        emissiveIntensity={0.8}
                        roughness={0.3}
                        metalness={0.5}
                        transparent
                        opacity={0.4}
                    />
                </Sphere>
            </Float>
        </group>
    )
}
