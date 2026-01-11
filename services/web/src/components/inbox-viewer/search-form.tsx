// services/web/src/components/inbox-viewer/search-form.tsx
import { useState } from "react";

interface SearchFormProps {
  onSearch: (email: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    // Empty check
    if (!trimmedEmail) {
      setError("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Invalid email format. Please enter a valid email address.");
      return;
    }

    onSearch(trimmedEmail);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-nebula-text-muted">
          Enter email address to view inbox
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="user@example.com"
            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-nebula-violet bg-nebula-elevated text-nebula-text ${
              error ? "border-red-500" : "border-nebula-border"
            }`}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-nebula-violet text-white rounded-lg hover:bg-nebula-violet-dark disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Note: Only public inboxes can be viewed. Private inboxes require owner authentication.
        </p>
      </div>
    </form>
  );
}

