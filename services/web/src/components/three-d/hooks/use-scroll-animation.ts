/**
 * Window Scroll Hook for 3D Scene
 * Tracks window scroll position for parallax effects
 * Does NOT hijack scroll - just observes window.scrollY
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

interface ScrollData {
    /** Scroll progress (0-1 based on document height) */
    progress: number
    /** Scroll velocity */
    velocity: number
    /** Raw scroll position in pixels */
    scrollY: number
}

/**
 * Hook that tracks window scroll for 3D parallax effects
 * Safe to use outside ScrollControls - no context dependency
 */
export function useWindowScroll(): ScrollData {
    const data = useRef<ScrollData>({ progress: 0, velocity: 0, scrollY: 0 })
    const prevScrollY = useRef(0)

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight
            const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0

            data.current.velocity = scrollY - prevScrollY.current
            data.current.scrollY = scrollY
            data.current.progress = progress
            prevScrollY.current = scrollY
        }

        // Initial calculation
        handleScroll()

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return data.current
}

/**
 * Hook that applies scroll-based transformations in useFrame
 * Returns current scroll progress (0-1)
 */
export function useScrollProgress(): number {
    const scrollRef = useRef(0)

    useFrame(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        scrollRef.current = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0
    })

    return scrollRef.current
}
