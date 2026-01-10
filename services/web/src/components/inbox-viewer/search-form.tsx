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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    onSearch(email);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-nebula-text-muted">
          Enter email address to view inbox
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2 border border-nebula-border rounded-lg focus:ring-2 focus:ring-nebula-violet bg-nebula-elevated text-nebula-text"
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
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
