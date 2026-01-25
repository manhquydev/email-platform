/**
 * InboxHeroSection - Hero section for inbox viewer empty state
 * Immersive, action-oriented design following Version C (Superhuman) style
 */
import { useState, useEffect } from "react";

interface InboxHeroSectionProps {
  onSearch: (email: string) => void;
  loading: boolean;
}

// Trust badge data
const trustBadges = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: "Không cần đăng ký",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: "Realtime",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Công khai",
  },
];

export function InboxHeroSection({ onSearch, loading }: InboxHeroSectionProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Định dạng email không hợp lệ");
      return;
    }

    onSearch(trimmedEmail);
  };

  return (
    <section className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl text-center space-y-8">
        {/* Headline - Staggered entrance */}
        <h1
          className={`text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight transition-all duration-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Xem hộp thư công khai tức thì
        </h1>

        {/* Subtext - Staggered entrance delay */}
        <p
          className={`text-zinc-400 text-base md:text-lg transition-all duration-200 delay-75 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Nhập địa chỉ email để kiểm tra - không cần đăng nhập
        </p>

        {/* Form - Staggered entrance delay */}
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 transition-all duration-200 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Email Input - Large, prominent */}
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="nguoidung@example.com"
              disabled={loading}
              className={`flex-1 h-14 px-5 bg-zinc-900 border rounded-lg text-white placeholder:text-zinc-500 text-base transition-colors duration-100 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10 ${
                error ? "border-red-500" : "border-zinc-800"
              }`}
              aria-label="Email address"
              aria-invalid={!!error}
            />

            {/* CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-14 px-8 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors duration-100 whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "..." : "Xem hộp thư"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}

          {/* Keyboard Hint */}
          <p className="text-zinc-500 text-sm">
            Nhấn{" "}
            <kbd className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono">
              Enter
            </kbd>{" "}
            để tìm kiếm
          </p>
        </form>

        {/* Trust Badges - Staggered entrance delay */}
        <div
          className={`flex flex-wrap items-center justify-center gap-4 pt-4 transition-all duration-200 delay-150 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {trustBadges.map((badge, index) => (
            <div key={index} className="flex items-center gap-2 text-zinc-400 text-sm">
              {badge.icon}
              <span>{badge.label}</span>
              {index < trustBadges.length - 1 && (
                <div className="w-px h-4 bg-zinc-800 hidden sm:block ml-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
