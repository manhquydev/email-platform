# Phase 05: Frontend - Telegram Link Modal

## Context

- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-02-telegram-integration.md](./research/researcher-02-telegram-integration.md)

## Parallelization Info

| Can Parallel With | Depends On | Blocks |
|-------------------|------------|--------|
| Phase 04 | Phase 01, 03 | Phase 06 |

## Overview

| Priority | Status | Effort |
|----------|--------|--------|
| P2 | ✅ done | 2h |

Create a modal component for linking inbox to Telegram. Shows QR code, deep link, countdown timer, and polls for success.

## Key Insights

- Modal opened from InboxViewer (Phase 04) via prop
- Polls `/api/public/telegram/status/:token` every 3 seconds
- Shows success message when `used: true`
- 24h countdown timer for expiry

## Requirements

1. Generate token on modal open
2. Display QR code (from API response)
3. Display Telegram deep link button
4. Show countdown timer (24h)
5. Poll for success status every 3s
6. Show success confirmation with linked info

## Related Code Files (EXCLUSIVE)

| File | Action | Description |
|------|--------|-------------|
| `services/web/src/components/telegram-link-modal.tsx` | Create | Modal component |

## File Ownership

- **ONLY this phase** creates `telegram-link-modal.tsx`
- Phase 04 imports and uses this component

## Implementation Steps

### 1. Create telegram-link-modal.tsx

```tsx
// services/web/src/components/telegram-link-modal.tsx
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "";

interface TelegramLinkModalProps {
  inboxEmail: string;
  onClose: () => void;
}

interface TokenData {
  token: string;
  qrCodeDataUrl: string;
  telegramLink: string;
  expiresAt: string;
}

type ModalState = "loading" | "ready" | "success" | "error" | "expired";

export function TelegramLinkModal({ inboxEmail, onClose }: TelegramLinkModalProps) {
  const [state, setState] = useState<ModalState>("loading");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Generate token on mount
  useEffect(() => {
    const generateToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/telegram/generate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inboxEmail }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate token");
        }

        const data: TokenData = await res.json();
        setTokenData(data);
        setState("ready");
      } catch (err: any) {
        setError(err.message);
        setState("error");
      }
    };

    generateToken();
  }, [inboxEmail]);

  // Countdown timer
  useEffect(() => {
    if (!tokenData?.expiresAt || state !== "ready") return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(tokenData.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setState("expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tokenData?.expiresAt, state]);

  // Poll for success
  useEffect(() => {
    if (!tokenData?.token || state !== "ready") return;

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/public/telegram/status/${tokenData.token}`
        );

        if (!res.ok) return;

        const data = await res.json();

        if (data.used) {
          setState("success");
          toast.success("Telegram linked successfully!");
        } else if (data.expired) {
          setState("expired");
        }
      } catch {
        // Ignore polling errors
      }
    };

    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [tokenData?.token, state]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Link to Telegram
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {state === "loading" && (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Generating link token...</p>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          )}

          {state === "ready" && tokenData && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Scan QR code or click the button to link <strong>{inboxEmail}</strong> to Telegram
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg mb-4">
                <img
                  src={tokenData.qrCodeDataUrl}
                  alt="Telegram QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Token display */}
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 mb-1">Your linking code:</p>
                <code className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                  {tokenData.token}
                </code>
              </div>

              {/* Timer */}
              <div className="text-sm text-gray-500 mb-4">
                Expires in: <span className="font-mono">{timeLeft}</span>
              </div>

              {/* Telegram button */}
              <a
                href={tokenData.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-[#0088cc] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#0077b5] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.46-1.9-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.306.019.472z"/>
                </svg>
                Open in Telegram
              </a>

              <p className="text-xs text-gray-500 mt-4 text-center">
                After clicking, send the start command to the bot
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="text-center py-8">
              <div className="text-green-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Successfully Linked!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You will now receive Telegram notifications for new emails to{" "}
                <strong>{inboxEmail}</strong>
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Done
              </button>
            </div>
          )}

          {state === "expired" && (
            <div className="text-center py-8">
              <div className="text-yellow-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The linking token has expired. Please try again.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Todo Checklist

- [ ] Create `components/telegram-link-modal.tsx`
- [ ] Implement token generation on mount
- [ ] Implement countdown timer
- [ ] Implement polling for success
- [ ] Style QR code display
- [ ] Add Telegram deep link button
- [ ] Handle expired state
- [ ] Handle error state
- [ ] Test modal open/close
- [ ] Test success flow

## Success Criteria

1. Modal opens and generates token
2. QR code displays correctly
3. Telegram button opens correct deep link
4. Countdown timer updates every second
5. Success state shows when token used
6. Expired state shows after 24h
7. Modal closes on backdrop click or Escape

## Conflict Prevention

- Only this phase creates `telegram-link-modal.tsx`
- Phase 04 imports this component
- No shared files with other phases

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Polling memory leak | Low | Low | Cleanup interval on unmount |
| QR code not loading | Low | Medium | Show token code as fallback |
| Timer drift | Very Low | Low | Update every second |

## Security Considerations

1. **No sensitive data** - Only token and QR displayed
2. **External link** - Opens Telegram in new tab
3. **Escape key** - User can always close modal
4. **No auth required** - Public feature
