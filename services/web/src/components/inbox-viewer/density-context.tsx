/**
 * DensityContext - User-configurable density settings
 * Compact vs Comfortable view toggle with localStorage persistence
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Density = "compact" | "comfortable";

interface DensityContextValue {
    density: Density;
    setDensity: (d: Density) => void;
    toggleDensity: () => void;
}

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

const STORAGE_KEY = "inbox-density";

export function DensityProvider({ children }: { children: ReactNode }) {
    const [density, setDensityState] = useState<Density>(() => {
        if (typeof window === "undefined") return "comfortable";
        return (localStorage.getItem(STORAGE_KEY) as Density) || "comfortable";
    });

    // Sync to localStorage and document attribute
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, density);
        document.documentElement.setAttribute("data-density", density);
    }, [density]);

    const setDensity = (d: Density) => setDensityState(d);
    const toggleDensity = () => setDensityState((d) => (d === "compact" ? "comfortable" : "compact"));

    return (
        <DensityContext.Provider value={{ density, setDensity, toggleDensity }}>
            {children}
        </DensityContext.Provider>
    );
}

export function useDensity() {
    const context = useContext(DensityContext);
    if (!context) {
        throw new Error("useDensity must be used within DensityProvider");
    }
    return context;
}
