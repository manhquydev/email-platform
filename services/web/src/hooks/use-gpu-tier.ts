/**
 * GPU Tier Detection Hook
 * Uses detect-gpu library for accurate GPU benchmarking
 */
import { useState, useEffect } from 'react'
import { getGPUTier } from 'detect-gpu'

export type GPUTier = 'high' | 'medium' | 'low'

/** GPU tier configuration for adaptive rendering */
export interface GPUTierConfig {
    particles: number
    postprocessing: boolean
    chromaticAberration: boolean
    orbs: boolean
}

/** Tier-based feature configuration */
export const GPU_TIER_CONFIG: Record<GPUTier, GPUTierConfig> = {
    high: { particles: 1000, postprocessing: true, chromaticAberration: true, orbs: true },
    medium: { particles: 500, postprocessing: true, chromaticAberration: false, orbs: true },
    low: { particles: 100, postprocessing: false, chromaticAberration: false, orbs: true }
}

/**
 * Detects GPU capability tier using detect-gpu library
 * Maps detect-gpu tiers (0-3) to our GPUTier type
 * - tier 3 → 'high': All effects, 1000 particles
 * - tier 2 → 'medium': No chromatic aberration, 500 particles
 * - tier 0-1 → 'low': No postprocessing, 100 particles
 */
export function useGPUTier(): { tier: GPUTier; loading: boolean; config: GPUTierConfig } {
    const [tier, setTier] = useState<GPUTier>('medium') // default medium while loading
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getGPUTier().then((result) => {
            // Map detect-gpu tier (0-3) to our tier system
            const mappedTier: GPUTier =
                result.tier >= 3 ? 'high' :
                result.tier >= 2 ? 'medium' : 'low'
            setTier(mappedTier)
            setLoading(false)
        }).catch(() => {
            // Fallback to medium on error
            setTier('medium')
            setLoading(false)
        })
    }, [])

    return { tier, loading, config: GPU_TIER_CONFIG[tier] }
}

/**
 * Hook to detect user's reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handler = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches)
        }

        mediaQuery.addEventListener('change', handler)
        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    return prefersReducedMotion
}
