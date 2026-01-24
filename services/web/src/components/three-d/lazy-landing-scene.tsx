/**
 * Lazy Landing 3D Scene
 * Wrapper that handles GPU detection and lazy loading of 3D scene
 */
import { lazy, Suspense } from 'react'
import { useGPUTier, usePrefersReducedMotion } from '../../hooks/use-gpu-tier'
import { CSSFallbackBackground } from './css-fallback-background'

// Lazy load the 3D scene for code splitting
const LandingHero3DScene = lazy(() =>
    import('./landing-hero-3d-scene').then(m => ({
        default: m.LandingHero3DScene
    }))
)

/**
 * Lazy-loaded 3D scene with automatic fallback
 * - High-end: Full 3D scene with particles and orbs
 * - Medium: 3D scene with reduced particles
 * - Low/Mobile: CSS-only animated background
 */
export function LazyLanding3DScene() {
    const tier = useGPUTier()
    const prefersReducedMotion = usePrefersReducedMotion()

    // Show loading state while detecting GPU tier
    if (tier === 'unknown') {
        return <CSSFallbackBackground variant="subtle" />
    }

    // Fallback to CSS for low-end devices (mobile)
    if (tier === 'low') {
        return <CSSFallbackBackground reducedMotion={prefersReducedMotion} />
    }

    // Medium tier: 3D but with reduced motion
    const reducedMotion = tier === 'medium' || prefersReducedMotion

    return (
        <Suspense fallback={<CSSFallbackBackground />}>
            <LandingHero3DScene reducedMotion={reducedMotion} gpuTier={tier} />
        </Suspense>
    )
}
