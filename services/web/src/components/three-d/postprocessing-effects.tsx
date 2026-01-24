/**
 * Postprocessing Effects for 3D Scene
 * Adds Bloom, ChromaticAberration, and Noise effects
 * GPU-tier gated to prevent mobile performance issues
 */
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

// Constant to avoid recreating Vector2 on each render
const ABERRATION_OFFSET = new Vector2(0.0015, 0.0015)

interface PostprocessingEffectsProps {
    /** Enable/disable all effects */
    enabled?: boolean
}

/**
 * Postprocessing effects wrapper
 * - Bloom: Glow on bright/emissive objects
 * - ChromaticAberration: Subtle lens effect at edges
 * - Noise: Film grain overlay for cinematic feel
 */
export function PostprocessingEffects({ enabled = true }: PostprocessingEffectsProps) {
    if (!enabled) return null

    return (
        <EffectComposer disableNormalPass>
            {/* Bloom - glow on emissive objects (intensity > 1) */}
            <Bloom
                luminanceThreshold={0.9}
                luminanceSmoothing={0.4}
                mipmapBlur
                intensity={1.2}
            />
            {/* Chromatic Aberration - subtle lens separation at edges */}
            <ChromaticAberration
                offset={ABERRATION_OFFSET}
                blendFunction={BlendFunction.NORMAL}
                radialModulation={false}
                modulationOffset={0}
            />
            {/* Noise - film grain for cinematic quality */}
            <Noise
                opacity={0.04}
                blendFunction={BlendFunction.OVERLAY}
            />
        </EffectComposer>
    )
}
