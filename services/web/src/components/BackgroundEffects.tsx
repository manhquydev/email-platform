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
    // Color configs with FULL opacity values (no double multiplication)
    const colorConfig = {
        subtle: {
            blob1: 'rgba(139, 92, 246, 0.25)',   // violet
            blob2: 'rgba(147, 51, 234, 0.20)',   // purple
            blob3: 'rgba(6, 182, 212, 0.15)',    // cyan
        },
        default: {
            blob1: 'rgba(139, 92, 246, 0.35)',   // violet
            blob2: 'rgba(147, 51, 234, 0.30)',   // purple
            blob3: 'rgba(6, 182, 212, 0.20)',    // cyan
        },
        intense: {
            blob1: 'rgba(139, 92, 246, 0.50)',   // violet
            blob2: 'rgba(147, 51, 234, 0.40)',   // purple
            blob3: 'rgba(6, 182, 212, 0.30)',    // cyan
        }
    };

    const colors = colorConfig[variant];

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary gradient blob - top left (violet) */}
            <div
                className={`absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full ${animate ? 'animate-pulse' : ''}`}
                style={{
                    background: colors.blob1,
                    filter: 'blur(120px)',
                    WebkitFilter: 'blur(120px)',
                }}
            />

            {/* Secondary gradient blob - bottom right (purple) */}
            <div
                className={`absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full ${animate ? 'animate-pulse' : ''}`}
                style={{
                    background: colors.blob2,
                    filter: 'blur(100px)',
                    WebkitFilter: 'blur(100px)',
                    animationDelay: '1s',
                }}
            />

            {/* Tertiary gradient blob - center (cyan) */}
            <div
                className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full"
                style={{
                    background: colors.blob3,
                    filter: 'blur(80px)',
                    WebkitFilter: 'blur(80px)',
                }}
            />

            {/* Optional grid pattern overlay */}
            {showGrid && (
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            )}
        </div>
    );
}
