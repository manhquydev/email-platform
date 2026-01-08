// Email Prompt Modal for Telegram Registration
import { useState } from "react";
import { api } from "../utils/api";

interface EmailPromptModalProps {
  tempToken: string;
  telegramUser: {
    id: string;
    username?: string;
    firstName?: string;
    photoUrl?: string;
  };
  onComplete: (token: string) => void;
  onCancel: () => void;
}

export function EmailPromptModal({
  tempToken,
  telegramUser,
  onComplete,
  onCancel,
}: EmailPromptModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api<{ token?: string }>("/auth/telegram/complete", {
        method: "POST",
        body: {
          tempToken,
          email,
          password: password || undefined,
        },
      });

      if (response.token) {
        onComplete(response.token);
      }
    } catch (err) {
      setError((err as Error).message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-2xl">
        <div className="mb-6 text-center">
          {telegramUser.photoUrl && (
            <img
              src={telegramUser.photoUrl}
              alt="Profile"
              className="mx-auto mb-3 h-16 w-16 rounded-full"
            />
          )}
          <h2 className="text-xl font-semibold text-white">
            Welcome, {telegramUser.firstName || telegramUser.username || "User"}!
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Telegram doesn't share your email address. Please provide one to complete
            registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password for email login"
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Optional: Set a password if you want to also login with email/password
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email || isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Complete Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
