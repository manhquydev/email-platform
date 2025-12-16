import { useState, useEffect } from "react";

export function useLocalStorage(key: string, initial: string) {
    const [value, setValue] = useState(() => {
        if (typeof window === "undefined") return initial;
        return window.localStorage.getItem(key) ?? initial;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, value);
    }, [key, value]);

    return [value, setValue] as const;
}
