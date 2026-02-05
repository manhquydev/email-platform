/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Base colors from CSS variables
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                'surface-elevated': 'var(--color-surface-elevated)',
                border: 'var(--color-border)',
                'border-hover': 'var(--color-border-hover)',

                // NEBULA PALETTE (Mapped from nebula-glass.css)
                // Using RGB format to support opacity modifiers (e.g., bg-nebula-elevated/50)
                nebula: {
                    void: 'rgb(var(--nebula-void-rgb) / <alpha-value>)',
                    surface: 'rgb(var(--nebula-surface-rgb) / <alpha-value>)',
                    elevated: 'rgb(var(--nebula-elevated-rgb) / <alpha-value>)',
                    border: 'rgb(var(--nebula-border-rgb) / <alpha-value>)',
                    'border-subtle': 'rgb(var(--nebula-border-subtle-rgb) / <alpha-value>)',
                    'border-highlight': 'rgb(var(--nebula-border-highlight-rgb) / <alpha-value>)',
                    violet: 'rgb(var(--nebula-violet-rgb) / <alpha-value>)',
                    'violet-light': 'rgb(var(--nebula-violet-light-rgb) / <alpha-value>)',
                    'violet-dark': 'rgb(var(--nebula-violet-dark-rgb) / <alpha-value>)',
                    cyan: 'rgb(var(--nebula-cyan-rgb) / <alpha-value>)',
                    pink: 'rgb(var(--nebula-pink-rgb) / <alpha-value>)',
                    text: 'rgb(var(--nebula-text-rgb) / <alpha-value>)',
                    'text-secondary': 'rgb(var(--nebula-text-secondary-rgb) / <alpha-value>)',
                    'text-muted': 'rgb(var(--nebula-text-muted-rgb) / <alpha-value>)',
                    'text-inverse': 'rgb(var(--nebula-text-inverse-rgb) / <alpha-value>)',
                },

                // Primary (Violet) - RGB format for opacity support
                primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
                'primary-hover': 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
                'primary-light': 'rgb(var(--color-primary-light-rgb) / <alpha-value>)',
                'primary-border': 'rgb(var(--color-primary-border-rgb) / <alpha-value>)',
                // Secondary (Cyan)
                'secondary': 'var(--color-brand-secondary)',
                // Accent (Pink)
                'accent': 'var(--color-brand-accent)',
                // Text
                'text-main': 'var(--color-text-main)',
                'text-secondary': 'var(--color-text-secondary)',
                muted: 'var(--color-text-muted)',
                'text-light': 'var(--color-text-light)',
                // Status
                danger: 'var(--color-danger)',
                'danger-bg': 'var(--color-danger-bg)',
                success: 'var(--color-success)',
                'success-bg': 'var(--color-success-bg)',
                warning: 'var(--color-warning)',
                'warning-bg': 'var(--color-warning-bg)',
                info: 'var(--color-info)',
                'info-bg': 'var(--color-info-bg)',

                // VERSION C PALETTE (Superhuman Style)
                v3: {
                    // Backgrounds
                    'bg-primary': 'var(--v3-bg-primary)',
                    'bg-elevated': 'var(--v3-bg-elevated)',
                    'bg-surface': 'var(--v3-bg-surface)',
                    'bg-hover': 'var(--v3-bg-hover)',
                    // Borders
                    'border-subtle': 'var(--v3-border-subtle)',
                    'border-default': 'var(--v3-border-default)',
                    'border-strong': 'var(--v3-border-strong)',
                    // Text
                    'text-primary': 'var(--v3-text-primary)',
                    'text-secondary': 'var(--v3-text-secondary)',
                    'text-muted': 'var(--v3-text-muted)',
                    'text-disabled': 'var(--v3-text-disabled)',
                    // Accent
                    'accent-primary': 'var(--v3-accent-primary)',
                    'accent-success': 'var(--v3-accent-success)',
                    'accent-error': 'var(--v3-accent-error)',
                    'accent-warning': 'var(--v3-accent-warning)',
                },
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
            },
            boxShadow: {
                'glow': 'var(--shadow-glow)',
                'glow-strong': 'var(--shadow-glow-strong)',
                'glow-cyan': 'var(--shadow-glow-cyan)',
                'glow-pink': 'var(--shadow-glow-pink)',
                // Nebula Shadows
                'nebula-sm': 'var(--nebula-shadow-sm)',
                'nebula-md': 'var(--nebula-shadow-md)',
                'nebula-lg': 'var(--nebula-shadow-lg)',
                'nebula-xl': 'var(--nebula-shadow-xl)',
                'nebula-glow': 'var(--nebula-shadow-glow)',
                // Version C Shadows (minimal)
                'v3-none': 'var(--v3-shadow-none)',
                'v3-sm': 'var(--v3-shadow-sm)',
            },
            // Mobile touch targets (44px minimum per WCAG 2.1)
            minHeight: {
                'touch': '44px',
                'touch-sm': '36px',
            },
            minWidth: {
                'touch': '44px',
                'touch-sm': '36px',
            },
            borderRadius: {
                'sm': 'var(--border-radius-sm)',
                'md': 'var(--border-radius-md)',
                'lg': 'var(--border-radius-lg)',
                'xl': 'var(--border-radius-xl)',
                // Nebula Radius
                'nebula-sm': 'var(--nebula-radius-sm)',
                'nebula-md': 'var(--nebula-radius-md)',
                'nebula-lg': 'var(--nebula-radius-lg)',
                'nebula-xl': 'var(--nebula-radius-xl)',
                // Version C Radius (max 8px)
                'v3-sm': 'var(--v3-radius-sm)',
                'v3-md': 'var(--v3-radius-md)',
                'v3-lg': 'var(--v3-radius-lg)',
            },
            transitionTimingFunction: {
                'nebula-fast': 'cubic-bezier(0.4, 0, 0.2, 1)', // 150ms
                'nebula-normal': 'cubic-bezier(0.4, 0, 0.2, 1)', // 200ms
                'nebula-slow': 'cubic-bezier(0.4, 0, 0.2, 1)', // 300ms
                'nebula-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // 500ms
            },
            animation: {
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-right': 'slideRight 1s ease-in-out infinite',
            },
            keyframes: {
                'glow-pulse': {
                    '0%, 100%': { boxShadow: 'var(--shadow-glow)' },
                    '50%': { boxShadow: 'var(--shadow-glow-strong)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'slide-in-left': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                'slideRight': {
                    // Progress bar slides from -100% to 400% (with w-1/3 width = 33%,
                    // traveling 500% total ensures it fully exits the container)
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(400%)' },
                },
            },
        },
    },
    plugins: [
        // Glassmorphism utilities for card-based email redesign
        function({ addUtilities }) {
            const glassUtilities = {
                '.glass': {
                    '@apply bg-nebula-elevated/50 backdrop-blur-[10px] border border-nebula-border/50': {},
                    '-webkit-backdrop-filter': 'blur(10px)', // Safari support
                },
                '.glass-elevated': {
                    '@apply bg-nebula-elevated/60 backdrop-blur-[12px] border border-nebula-border/60 shadow-nebula-md': {},
                    '-webkit-backdrop-filter': 'blur(12px)',
                },
                '.glass-unread': {
                    '@apply bg-gradient-to-r from-primary/10 via-nebula-elevated/50 to-transparent backdrop-blur-[10px] border-l-4 border-l-primary border-t border-r border-b border-nebula-border/50': {},
                    '-webkit-backdrop-filter': 'blur(10px)',
                },
                // Hover variants
                '.glass-hover': {
                    '@apply hover:bg-nebula-elevated/70 hover:backdrop-blur-[14px] hover:border-nebula-border/70 hover:shadow-nebula-lg transition-all duration-200': {},
                    '&:hover': {
                        '-webkit-backdrop-filter': 'blur(14px)',
                    },
                },
            };

            addUtilities(glassUtilities, ['responsive', 'hover']);
        },
    ],
}
