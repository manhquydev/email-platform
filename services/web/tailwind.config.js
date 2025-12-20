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
                // Primary (Violet)
                primary: 'var(--color-primary)',
                'primary-hover': 'var(--color-primary-hover)',
                'primary-light': 'var(--color-primary-light)',
                'primary-border': 'var(--color-primary-border)',
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
            },
            borderRadius: {
                'sm': 'var(--border-radius-sm)',
                'md': 'var(--border-radius-md)',
                'lg': 'var(--border-radius-lg)',
                'xl': 'var(--border-radius-xl)',
            },
            animation: {
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
            },
            keyframes: {
                'glow-pulse': {
                    '0%, 100%': { boxShadow: 'var(--shadow-glow)' },
                    '50%': { boxShadow: 'var(--shadow-glow-strong)' },
                },
            },
        },
    },
    plugins: [],
}
