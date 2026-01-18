/**
 * BackgroundEffects Component
 *
 * Shared animated gradient background with blur effects.
 * Used across all pages for consistent visual experience.
 */

interface BackgroundEffectsProps {
    /** Intensity variant - affects opacity and blur */
    variant?: 'default' | 'subtle' | 'intense';
    /** Whether to include grid pattern overlay */
    showGrid?: boolean;
    /** Whether to animate the blobs */
    animate?: boolean;
}

export function BackgroundEffects({
    variant = 'default',
    showGrid = false,
    animate = true
}: BackgroundEffectsProps) {
    // Opacity values based on variant
    const opacityConfig = {
        subtle: { blob1: 0.3, blob2: 0.2, blob3: 0.15 },
        default: { blob1: 0.5, blob2: 0.4, blob3: 0.25 },
        intense: { blob1: 0.6, blob2: 0.5, blob3: 0.35 }
    };

    const config = opacityConfig[variant];

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary gradient blob - top left (violet/blue) */}
            <div
                className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] ${animate ? 'animate-pulse' : ''}`}
                style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    opacity: config.blob1,
                }}
            />

            {/* Secondary gradient blob - bottom right (purple) */}
            <div
                className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${animate ? 'animate-pulse' : ''}`}
                style={{
                    background: 'rgba(147, 51, 234, 0.12)',
                    opacity: config.blob2,
                    animationDelay: '1s',
                }}
            />

            {/* Tertiary gradient blob - center (cyan) */}
            <div
                className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full blur-[100px]"
                style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    opacity: config.blob3,
                }}
            />

            {/* Optional grid pattern overlay */}
            {showGrid && (
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            )}
        </div>
    );
}
