/**
 * Instanced Particles Component
 * High-performance particle system using InstancedMesh (1 draw call)
 * Includes mouse repulsion and scroll-linked animations
 */
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useWindowScroll } from './hooks/use-scroll-animation'

interface InstancedParticlesProps {
    /** Number of particles (1000 high, 300 medium, 100 low) */
    count?: number
    /** Enable floating animation */
    animate?: boolean
    /** Enable mouse repulsion effect */
    enableMouseInteraction?: boolean
    /** Enable scroll-linked animations */
    enableScrollAnimation?: boolean
}

// Pre-allocated objects to avoid GC
const dummy = new THREE.Object3D()
const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const mousePos3D = new THREE.Vector3()

interface ParticleData {
    basePosition: THREE.Vector3
    currentPosition: THREE.Vector3
    velocity: THREE.Vector3
    scale: number
    speed: number
    offset: number
}

export function InstancedParticles({
    count = 1000,
    animate = true,
    enableMouseInteraction = true,
    enableScrollAnimation = false
}: InstancedParticlesProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const materialRef = useRef<THREE.MeshStandardMaterial>(null)
    const { pointer, camera } = useThree()

    // Track window scroll for parallax
    const scrollData = useWindowScroll()

    // Pre-compute particle data (positions, velocities, scales)
    const particles = useMemo<ParticleData[]>(() => {
        return Array.from({ length: count }, () => ({
            basePosition: new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ),
            currentPosition: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            scale: 0.5 + Math.random() * 0.5,
            speed: 0.2 + Math.random() * 0.3,
            offset: Math.random() * Math.PI * 2
        }))
    }, [count])

    // Initialize current positions from base positions
    useMemo(() => {
        particles.forEach(p => p.currentPosition.copy(p.basePosition))
    }, [particles])

    // Animation and interaction loop
    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.elapsedTime

        // Mouse repulsion calculation
        let mouseActive = false
        if (enableMouseInteraction) {
            raycaster.setFromCamera(pointer, camera)
            const intersected = raycaster.ray.intersectPlane(plane, mousePos3D)
            mouseActive = intersected !== null &&
                Math.abs(pointer.x) < 1 &&
                Math.abs(pointer.y) < 1
        }

        // Scroll progress for fade/drift
        const scrollProgress = enableScrollAnimation ? scrollData.progress : 0

        // Update each particle
        particles.forEach((p, i) => {
            // Mouse repulsion
            if (mouseActive && enableMouseInteraction) {
                const dx = p.currentPosition.x - mousePos3D.x
                const dy = p.currentPosition.y - mousePos3D.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                if (dist < 2 && dist > 0.01) {
                    // V3: Reduced force for calmer interaction
                    const force = 0.008 / (dist * dist + 0.1)
                    p.velocity.x += (dx / dist) * force
                    p.velocity.y += (dy / dist) * force
                }
            }

            // Drift back to base position
            p.velocity.x += (p.basePosition.x - p.currentPosition.x) * 0.008
            p.velocity.y += (p.basePosition.y - p.currentPosition.y) * 0.008
            p.velocity.z += (p.basePosition.z - p.currentPosition.z) * 0.008

            // Apply velocity with damping
            p.currentPosition.add(p.velocity)
            p.velocity.multiplyScalar(0.92)

            // V3: Slower floating animation for eye comfort
            dummy.position.copy(p.currentPosition)
            if (animate) {
                dummy.position.y += Math.sin(time * p.speed * 0.5 + p.offset) * 0.05
            }

            // V3: Reduced scroll drift
            if (enableScrollAnimation) {
                dummy.position.y -= scrollProgress * 1.5
            }

            // Set scale
            dummy.scale.setScalar(p.scale * 0.03)
            dummy.updateMatrix()
            meshRef.current!.setMatrixAt(i, dummy.matrix)
        })

        // Update instance matrices
        meshRef.current.instanceMatrix.needsUpdate = true

        // V3: Lower base opacity for eye comfort
        if (enableScrollAnimation && materialRef.current) {
            materialRef.current.opacity = 0.5 * (1 - scrollProgress * 0.6)
        }
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            {/* V3: Reduced emissive for eye comfort */}
            <meshStandardMaterial
                ref={materialRef}
                color="#8b5cf6"
                emissive="#8b5cf6"
                emissiveIntensity={0.4}
                transparent
                opacity={0.5}
            />
        </instancedMesh>
    )
}
