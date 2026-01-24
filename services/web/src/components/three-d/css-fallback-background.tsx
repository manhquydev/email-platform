/**
 * CSS Fallback Background
 * Used when 3D is not available or on low-end devices
 */

interface CSSFallbackBackgroundProps {
    /** Variant for different intensity levels */
    variant?: 'default' | 'subtle'
    /** Disable animations for reduced motion preference */
    reducedMotion?: boolean
}

export function CSSFallbackBackground({
    variant = 'default',
    reducedMotion = false
}: CSSFallbackBackgroundProps) {
    const opacity = variant === 'subtle' ? 'opacity-50' : ''
    const animation = reducedMotion ? '' : 'animate-pulse'

    return (
        <div className={`absolute inset-0 -z-10 overflow-hidden ${opacity}`}>
            {/* Primary violet blob - top left */}
            <div
                className={`absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl ${animation}`}
            />

            {/* Secondary purple blob - bottom right */}
            <div
                className={`absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl ${animation}`}
                style={{ animationDelay: '1s' }}
            />

            {/* Tertiary cyan accent - center */}
            <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl ${animation}`}
                style={{ animationDelay: '2s' }}
            />
        </div>
    )
}
