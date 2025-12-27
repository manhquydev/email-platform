
import { useState, useEffect, useRef } from "react";
import { api } from "../../utils/api";
import { LoadingSpinner } from "./AdminUIComponents";

interface User {
    id: string;
    email: string;
    role: string;
}

interface UserSelectProps {
    value: string;
    onChange: (userId: string) => void;
    label?: string;
    placeholder?: string;
    token: string;
}

export function UserSelect({ value, onChange, label, placeholder = "Search user by email...", token }: UserSelectProps) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch users on search
    useEffect(() => {
        const fetchUsers = async () => {
            if (!query && !isOpen) return;

            setIsLoading(true);
            try {
                const res = await api<{ data: User[] }>(`/admin/users?search=${encodeURIComponent(query)}&limit=5`, { token });
                setUsers(res.data);
            } catch (error) {
                console.error("Failed to search users", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchUsers, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    // Fetch initial selected user if value exists
    useEffect(() => {
        if (value && !selectedUser) {
            // Ideally we should have an endpoint to get user by ID, or we just trust the ID. 
            // For now, let's try to find it if we can or just show the ID.
            // Or we can fetch specific user detail.
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (user: User) => {
        setSelectedUser(user);
        onChange(user.id);
        setQuery(user.email);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}

            <div className="relative">
                <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        if (!e.target.value) onChange("");
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <LoadingSpinner size="sm" />
                    </div>
                )}
            </div>

            {isOpen && users.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1f1f23] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 max-h-60 overflow-auto">
                    {users.map(user => (
                        <div
                            key={user.id}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex flex-col border-b border-gray-100 dark:border-white/5 last:border-0 ${user.id === value ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                            onClick={() => handleSelect(user)}
                        >
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id} • Role: {user.role}</span>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && !isLoading && users.length === 0 && query && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1f1f23] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 p-4 text-center text-sm text-gray-500">
                    No users found
                </div>
            )}
        </div>
    );
}
