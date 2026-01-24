// services/web/src/components/inbox-viewer/search-form.tsx
// Supports compact/comfortable density modes
import { useState } from "react";
import { useDensity } from "./density-context";

interface SearchFormProps {
  onSearch: (email: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { density } = useDensity();
  const isCompact = density === "compact";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    // Empty check
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Định dạng email không hợp lệ. Vui lòng nhập địa chỉ email đúng.");
      return;
    }

    onSearch(trimmedEmail);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className={`flex flex-col ${isCompact ? "gap-2" : "gap-3"}`}>
        <label className={`font-medium text-zinc-400 ${isCompact ? "text-xs" : "text-sm"}`}>
          Nhập địa chỉ email để xem hộp thư
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            placeholder="nguoidung@example.com"
            className={`flex-1 bg-zinc-900 border rounded-lg text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors duration-100 ${
              isCompact ? "px-3 py-2 text-sm" : "px-4 py-3"
            } ${error ? "border-red-500" : "border-zinc-800"}`}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={`bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors duration-100 ${
              isCompact ? "px-4 py-2 text-sm" : "px-6 py-3"
            }`}
          >
            {loading ? "..." : "Tìm kiếm"}
          </button>
        </div>
        {error && (
          <p className={`text-red-500 flex items-center gap-1 ${isCompact ? "text-xs" : "text-sm"}`}>
            <svg className={isCompact ? "w-3 h-3" : "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        <p className={`text-zinc-600 ${isCompact ? "text-[10px]" : "text-xs"}`}>
          Lưu ý: Chỉ có thể xem hộp thư công khai. Hộp thư riêng tư yêu cầu đăng nhập.
        </p>
      </div>
    </form>
  );
}

