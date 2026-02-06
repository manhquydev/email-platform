/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Retro Terminal Palette
                terminal: {
                    black: '#050505',   // Deep Void
                    dark: '#0a0a0a',    // Off-screen
                    panel: '#111111',   // Window panes
                    surface: '#18181b', // Input backgrounds
                    border: '#333333',
                },
                neon: {
                    green: '#39ff14',   // Primary / Success
                    amber: '#ffbf00',   // Secondary / Warning
                    cyan: '#00ffff',    // Info / Links
                    pink: '#ff00ff',    // Highlights
                },
                signal: {
                    error: '#ff0033',
                    success: '#00ff9d',
                    warning: '#ffee00',
                },
                phosphor: {
                    bright: '#e0e0e0',
                    dim: '#a0a0a0',
                    faint: '#404040',
                },
                // Shadcn UI Mapping (for compatibility if needed)
                background: '#050505',
                foreground: '#e0e0e0',
                card: {
                    DEFAULT: '#111111',
                    foreground: '#e0e0e0',
                },
                popover: {
                    DEFAULT: '#111111',
                    foreground: '#e0e0e0',
                },
                primary: {
                    DEFAULT: '#39ff14',
                    foreground: '#050505',
                },
                secondary: {
                    DEFAULT: '#ffbf00',
                    foreground: '#050505',
                },
                muted: {
                    DEFAULT: '#18181b',
                    foreground: '#a0a0a0',
                },
                accent: {
                    DEFAULT: '#18181b',
                    foreground: '#39ff14',
                },
                destructive: {
                    DEFAULT: '#ff0033',
                    foreground: '#e0e0e0',
                },
                border: '#333333',
                input: '#18181b',
                ring: '#39ff14',
            },
            fontFamily: {
                display: ['"Share Tech Mono"', 'monospace'],
                body: ['"Inconsolata"', 'monospace'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                'neon-green': '0 0 5px rgba(57, 255, 20, 0.5), 0 0 10px rgba(57, 255, 20, 0.3)',
                'neon-amber': '0 0 5px rgba(255, 191, 0, 0.5), 0 0 10px rgba(255, 191, 0, 0.3)',
                'crt-inset': 'inset 0 0 100px rgba(0,0,0,0.9)',
            },
            dropShadow: {
                'glow': '0 0 10px rgba(57, 255, 20, 0.5)',
            },
            backgroundImage: {
                'scanlines': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
            },
            animation: {
                'blink': 'blink 1s step-end infinite',
                'flicker': 'flicker 0.3s infinite',
                'scan': 'scan 8s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                flicker: {
                    '0%': { opacity: '0.97' },
                    '5%': { opacity: '0.95' },
                    '10%': { opacity: '0.9' },
                    '15%': { opacity: '0.95' },
                    '20%': { opacity: '0.99' },
                    '25%': { opacity: '0.95' },
                    '30%': { opacity: '0.9' },
                    '35%': { opacity: '0.96' },
                    '40%': { opacity: '0.98' },
                    '45%': { opacity: '0.95' },
                    '50%': { opacity: '0.99' },
                    '55%': { opacity: '0.93' },
                    '60%': { opacity: '0.9' },
                    '65%': { opacity: '0.96' },
                    '70%': { opacity: '1' },
                    '75%': { opacity: '0.97' },
                    '80%': { opacity: '0.95' },
                    '85%': { opacity: '0.93' },
                    '90%': { opacity: '0.9' },
                    '95%': { opacity: '0.96' },
                    '100%': { opacity: '0.99' },
                },
                scan: {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '0 100%' },
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        function({ addUtilities }) {
            addUtilities({
                '.text-glow-green': {
                    'text-shadow': '0 0 5px rgba(57, 255, 20, 0.5), 0 0 10px rgba(57, 255, 20, 0.3)',
                },
                '.text-glow-amber': {
                    'text-shadow': '0 0 5px rgba(255, 191, 0, 0.5), 0 0 10px rgba(255, 191, 0, 0.3)',
                },
                '.text-glow-cyan': {
                    'text-shadow': '0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3)',
                },
                '.crt-overlay': {
                    'background': 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                    'background-size': '100% 2px, 3px 100%',
                }
            })
        }
    ],
}
