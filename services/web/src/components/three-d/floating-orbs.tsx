/**
 * Floating Orbs Component
 * Decorative floating spheres with brand colors
 */
import { Float, Sphere } from '@react-three/drei'

interface FloatingOrbsProps {
    /** Disable animations for reduced motion preference */
    reducedMotion?: boolean
}

export function FloatingOrbs({ reducedMotion = false }: FloatingOrbsProps) {
    const floatSpeed = reducedMotion ? 0 : 2
    const floatSpeedSlow = reducedMotion ? 0 : 1.5
    const floatSpeedSlowest = reducedMotion ? 0 : 1

    return (
        <>
            {/* Primary violet orb - larger, top-left */}
            <Float speed={floatSpeed} rotationIntensity={0.5} floatIntensity={1}>
                <Sphere args={[0.5, 32, 32]} position={[-2, 1, -2]}>
                    <meshStandardMaterial
                        color="#8b5cf6"
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
                        roughness={0.3}
                        metalness={0.5}
                        transparent
                        opacity={0.4}
                    />
                </Sphere>
            </Float>
        </>
    )
}
