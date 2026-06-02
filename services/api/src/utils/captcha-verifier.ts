import { appConfig } from "../config";

// Both providers expose a near-identical server-side siteverify endpoint.
const VERIFY_ENDPOINTS: Record<string, string> = {
    turnstile: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    hcaptcha: "https://hcaptcha.com/siteverify",
};

/**
 * Verify a CAPTCHA token against the configured provider (Cloudflare Turnstile or hCaptcha).
 *
 * Replaces the previous `token === captchaSecret` static compare, which let anyone who
 * learned the secret (or guessed an empty config) bypass the gate. Fails closed: a missing
 * secret/token or any provider/network error returns false.
 */
export async function verifyCaptchaToken(token: string | undefined, remoteIp?: string): Promise<boolean> {
    if (!appConfig.captchaSecret || !token) {
        return false;
    }

    const endpoint = VERIFY_ENDPOINTS[appConfig.captchaProvider] ?? VERIFY_ENDPOINTS.turnstile;
    const form = new URLSearchParams();
    form.set("secret", appConfig.captchaSecret);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { success?: boolean };
        return data.success === true;
    } catch {
        return false;
    }
}
