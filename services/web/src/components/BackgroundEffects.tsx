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
    // Opacity multipliers based on variant
    const opacityConfig = {
        subtle: { light: 0.2, dark: 0.3 },
        default: { light: 0.4, dark: 0.6 },
        intense: { light: 0.5, dark: 0.7 }
    };

    const config = opacityConfig[variant];

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary gradient blob - top left */}
            <div
                className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px] ${animate ? 'animate-pulse-slow' : ''}`}
                style={{
                    opacity: `var(--bg-opacity-1, ${config.light})`,
                }}
            />

            {/* Secondary gradient blob - bottom right */}
            <div
                className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] ${animate ? 'animate-pulse-slow delay-1000' : ''}`}
                style={{
                    opacity: `var(--bg-opacity-2, ${config.light * 0.75})`,
                }}
            />

            {/* Tertiary gradient blob - center */}
            <div
                className={`absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px]`}
                style={{
                    opacity: `var(--bg-opacity-3, ${config.light * 0.5})`,
                }}
            />

            {/* Optional grid pattern overlay */}
            {showGrid && (
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            )}

            {/* Dark mode adjustments via CSS custom properties */}
            <style>{`
                .dark {
                    --bg-opacity-1: ${config.dark};
                    --bg-opacity-2: ${config.dark * 0.83};
                    --bg-opacity-3: ${config.dark * 0.5};
                }
            `}</style>
        </div>
    );
}
