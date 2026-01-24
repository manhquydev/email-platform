/**
 * GPU Tier Detection Hook
 * Detects device capability to determine 3D rendering strategy
 */
import { useState, useEffect } from 'react'

export type GPUTier = 'high' | 'medium' | 'low' | 'unknown'

/**
 * Detects GPU capability tier for adaptive 3D rendering
 * - high: Desktop with WebGL2 support
 * - medium: Desktop without WebGL2
 * - low: Mobile devices (use CSS fallback)
 * - unknown: Initial state before detection
 */
export function useGPUTier(): GPUTier {
    const [tier, setTier] = useState<GPUTier>('unknown')

    useEffect(() => {
        // Simple heuristic based on device type and WebGL support
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const canvas = document.createElement('canvas')
        const hasWebGL2 = !!canvas.getContext('webgl2')

        if (isMobile) {
            setTier('low')
        } else if (hasWebGL2) {
            setTier('high')
        } else {
            setTier('medium')
        }
    }, [])

    return tier
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
