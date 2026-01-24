/**
 * Postprocessing Effects for 3D Scene
 * Adds Bloom, ChromaticAberration, and Noise effects
 * GPU-tier gated to prevent mobile performance issues
 */
import { EffectComposer, Bloom } from '@react-three/postprocessing'

interface PostprocessingEffectsProps {
    /** Enable/disable all effects */
    enabled?: boolean
}

/**
 * Postprocessing effects wrapper (V3 - Eye Comfort)
 * - Bloom: Subtle glow only, reduced intensity for eye comfort
 * - Removed: ChromaticAberration (causes eye strain)
 * - Removed: Noise (causes visual fatigue)
 */
export function PostprocessingEffects({ enabled = true }: PostprocessingEffectsProps) {
    if (!enabled) return null

    return (
        <EffectComposer enableNormalPass={false}>
            {/* Bloom - subtle glow, reduced for eye comfort */}
            <Bloom
                luminanceThreshold={0.95}
                luminanceSmoothing={0.5}
                mipmapBlur
                intensity={0.4}
            />
        </EffectComposer>
    )
}
