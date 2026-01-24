/**
 * Mouse Repulsion Hook for 3D Particles
 * Creates "privacy shield" effect - particles flee from cursor
 */
import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

interface MouseRepulsionOptions {
    /** Radius of effect around cursor (default: 2) */
    radius?: number
    /** Repulsion strength (default: 0.02) */
    strength?: number
    /** Velocity damping factor (default: 0.95) */
    damping?: number
    /** Return to original position strength (default: 0.01) */
    returnStrength?: number
    /** Enable/disable the effect */
    enabled?: boolean
}

/**
 * Hook that applies mouse repulsion to particle positions
 * Particles flee from cursor and slowly drift back to original positions
 * Handles coordinate transformation for rotating containers
 */
export function useMouseRepulsion(
    positionsRef: React.RefObject<THREE.BufferAttribute | null>,
    velocitiesRef: React.MutableRefObject<Float32Array | null>,
    originalPositionsRef: React.RefObject<Float32Array | null>,
    count: number,
    containerRef: React.RefObject<THREE.Object3D | null>,
    options: MouseRepulsionOptions = {}
) {
    const {
        radius = 2,
        strength = 0.02,
        damping = 0.95,
        returnStrength = 0.01,
        enabled = true
    } = options

    const { pointer, camera } = useThree()
    const isPointerActive = useRef(false)

    // Pre-allocate objects to avoid GC (memoized for isolation)
    const raycaster = useMemo(() => new THREE.Raycaster(), [])
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const mousePos3D = useMemo(() => new THREE.Vector3(), [])
    const localMousePos = useMemo(() => new THREE.Vector3(), [])
    const inverseMatrix = useMemo(() => new THREE.Matrix4(), [])

    // Track pointer activity
    useFrame(() => {
        if (!enabled) return

        const positions = positionsRef.current
        const velocities = velocitiesRef.current
        const originalPositions = originalPositionsRef.current

        if (!positions || !velocities || !originalPositions) return

        // Raycast mouse to z=0 plane for 3D position
        raycaster.setFromCamera(pointer, camera)
        const intersected = raycaster.ray.intersectPlane(plane, mousePos3D)

        // Check if pointer is within reasonable bounds
        isPointerActive.current = intersected !== null &&
            Math.abs(pointer.x) < 1 &&
            Math.abs(pointer.y) < 1

        const posArray = positions.array as Float32Array

        // Transform mouse position to local space if container is rotating
        if (containerRef.current && isPointerActive.current) {
            inverseMatrix.copy(containerRef.current.matrixWorld).invert()
            localMousePos.copy(mousePos3D).applyMatrix4(inverseMatrix)
        }

        // Track if any particle moved (for idle optimization)
        let hasMovement = false

        for (let i = 0; i < count; i++) {
            const idx = i * 3

            if (isPointerActive.current) {
                // Calculate distance to mouse in local space
                const dx = posArray[idx] - localMousePos.x
                const dy = posArray[idx + 1] - localMousePos.y
                const distSq = dx * dx + dy * dy
                const dist = Math.sqrt(distSq)

                // Apply repulsion if within radius
                if (dist < radius && dist > 0.01) {
                    const force = strength / (dist * dist + 0.1)
                    velocities[idx] += (dx / dist) * force
                    velocities[idx + 1] += (dy / dist) * force
                    hasMovement = true
                }
            }

            // Drift back to original position
            const origX = originalPositions[idx]
            const origY = originalPositions[idx + 1]
            const origZ = originalPositions[idx + 2]

            velocities[idx] += (origX - posArray[idx]) * returnStrength
            velocities[idx + 1] += (origY - posArray[idx + 1]) * returnStrength
            velocities[idx + 2] += (origZ - posArray[idx + 2]) * returnStrength

            // Apply velocity with damping
            posArray[idx] += velocities[idx]
            posArray[idx + 1] += velocities[idx + 1]
            posArray[idx + 2] += velocities[idx + 2]

            // Dampen velocity
            velocities[idx] *= damping
            velocities[idx + 1] *= damping
            velocities[idx + 2] *= damping

            // Check if particle has significant velocity
            if (Math.abs(velocities[idx]) > 0.0001 ||
                Math.abs(velocities[idx + 1]) > 0.0001 ||
                Math.abs(velocities[idx + 2]) > 0.0001) {
                hasMovement = true
            }
        }

        // Only mark buffer for GPU update if there was movement
        if (hasMovement) {
            positions.needsUpdate = true
        }
    })
}
