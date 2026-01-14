// Telegram Login Widget Component
import { useEffect, useRef } from "react";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: "large" | "medium" | "small";
  cornerRadius?: number;
  showUserPhoto?: boolean;
  className?: string;
}

export function TelegramLoginButton({
  botName,
  onAuth,
  buttonSize = "large",
  cornerRadius,
  showUserPhoto = true,
  className = "",
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botName) return;

    // Expose callback to window for Telegram widget
    const callbackName = `onTelegramAuth_${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callbackName] = onAuth;

    // Create and load Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", buttonSize);
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-request-access", "write");

    if (cornerRadius !== undefined) {
      script.setAttribute("data-radius", String(cornerRadius));
    }
    if (!showUserPhoto) {
      script.setAttribute("data-userpic", "false");
    }

    const container = containerRef.current;
    container?.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (container) {
        const existingScript = container.querySelector("script");
        if (existingScript) {
          container.removeChild(existingScript);
        }
        // Also remove the iframe that Telegram creates
        const iframe = container.querySelector("iframe");
        if (iframe) {
          container.removeChild(iframe);
        }
      }
    };
  }, [botName, onAuth, buttonSize, cornerRadius, showUserPhoto]);

  return <div ref={containerRef} className={className} />;
}
