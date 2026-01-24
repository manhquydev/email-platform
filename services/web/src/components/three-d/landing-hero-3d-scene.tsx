/**
 * Landing Hero 3D Scene
 * Main Canvas wrapper for the landing page 3D background
 * Includes scroll-linked parallax effects (using window scroll, no hijacking)
 */
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { EphemeralParticles } from './ephemeral-particles'
import { FloatingOrbs } from './floating-orbs'
import { PostprocessingEffects } from './postprocessing-effects'
import type { GPUTier } from '../../hooks/use-gpu-tier'

interface LandingHero3DSceneProps {
    /** Reduced motion mode - fewer particles, no animation */
    reducedMotion?: boolean
    /** GPU tier for adaptive rendering */
    gpuTier?: GPUTier
    /** Enable scroll-linked animations */
    enableScrollAnimation?: boolean
}

export function LandingHero3DScene({
    reducedMotion = false,
    gpuTier = 'high',
    enableScrollAnimation = true
}: LandingHero3DSceneProps) {
    // Enable postprocessing only on high-tier GPUs and when motion is allowed
    const enablePostprocessing = gpuTier === 'high' && !reducedMotion
    // Enable mouse interaction only on high/medium tier (not mobile)
    const enableMouseInteraction = gpuTier !== 'low' && !reducedMotion
    // Enable scroll animation only when motion is allowed
    const scrollEnabled = enableScrollAnimation && !reducedMotion

    return (
        <div className="fixed inset-0 -z-10">
            <Canvas
                frameloop="always"
                dpr={[1, 2]}
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <Suspense fallback={null}>
                    {/* Ambient lighting */}
                    <ambientLight intensity={0.3} />

                    {/* Key light from top-right */}
                    <pointLight
                        position={[10, 10, 10]}
                        intensity={0.5}
                        color="#ffffff"
                    />

                    {/* Accent light from bottom-left */}
                    <pointLight
                        position={[-5, -5, 5]}
                        intensity={0.2}
                        color="#8b5cf6"
                    />

                    {/* Particle system with mouse repulsion and scroll fade */}
                    <EphemeralParticles
                        count={reducedMotion ? 100 : 500}
                        animate={!reducedMotion}
                        enableMouseInteraction={enableMouseInteraction}
                        enableScrollAnimation={scrollEnabled}
                    />

                    {/* Floating geometric shapes with scroll scale */}
                    <FloatingOrbs
                        reducedMotion={reducedMotion}
                        enableScrollAnimation={scrollEnabled}
                    />

                    {/* Postprocessing effects - GPU tier gated */}
                    <PostprocessingEffects enabled={enablePostprocessing} />
                </Suspense>
            </Canvas>
        </div>
    )
}
