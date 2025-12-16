/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                border: 'var(--color-border)',
                'border-hover': 'var(--color-border-hover)',
                primary: 'var(--color-primary)',
                'primary-hover': 'var(--color-primary-hover)',
                'primary-light': 'var(--color-primary-light)',
                'primary-border': 'var(--color-primary-border)',
                'text-main': 'var(--color-text-main)',
                muted: 'var(--color-text-muted)',
                danger: 'var(--color-danger)',
                'danger-bg': 'var(--color-danger-bg)',
            }
        },
    },
    plugins: [],
}
