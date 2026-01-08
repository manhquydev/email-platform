import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme') as Theme;
        // Default to dark theme to match Ephemera landing page style
        return stored || 'dark';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateResolvedTheme = () => {
            let resolved: 'light' | 'dark';
            if (theme === 'system') {
                resolved = mediaQuery.matches ? 'dark' : 'light';
            } else {
                resolved = theme;
            }
            setResolvedTheme(resolved);
            document.documentElement.setAttribute('data-theme', resolved);
            if (resolved === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        updateResolvedTheme();

        // Listen for system theme changes
        mediaQuery.addEventListener('change', updateResolvedTheme);
        return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
