/**
 * Anonymous Auth Service - Handles anonymous account creation and passkey auth
 * Uses SimpleWebAuthn for passkey operations
 */
import { api } from "../utils/api";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

export interface AnonymousAccount {
  accountCode: string;
  visitorToken: string;
  accessToken: string;
  hasPasskey?: boolean;
}

export interface AnonymousSession {
  accountCode: string;
  tier: string;
  hasPasskey: boolean;
}

/**
 * Create a new anonymous account (zero PII)
 */
export async function createAnonymousAccount(): Promise<AnonymousAccount> {
  return api<AnonymousAccount>("/auth/anonymous", {
    method: "POST",
  });
}

/**
 * Restore session from visitor token
 */
export async function restoreAnonymousSession(
  visitorToken: string
): Promise<AnonymousAccount> {
  return api<AnonymousAccount>("/auth/anonymous/restore", {
    method: "POST",
    body: { visitorToken },
  });
}

/**
 * Get current anonymous session info
 */
export async function getAnonymousSession(
  token: string
): Promise<AnonymousSession> {
  return api<AnonymousSession>("/auth/anonymous/me", { token });
}

/**
 * Register a passkey for the current anonymous account
 */
export async function registerPasskey(token: string): Promise<boolean> {
  // Step 1: Get registration options from server
  const options = await api<PublicKeyCredentialCreationOptionsJSON>(
    "/auth/anonymous/passkey/register/options",
    { method: "POST", token }
  );

  // Step 2: Create credential with browser WebAuthn API
  const credential = await startRegistration({ optionsJSON: options });

  // Step 3: Verify with server
  const result = await api<{ success: boolean }>(
    "/auth/anonymous/passkey/register/verify",
    {
      method: "POST",
      token,
      body: credential,
    }
  );

  return result.success;
}

/**
 * Login with passkey using account code
 */
export async function loginWithPasskey(
  accountCode: string
): Promise<AnonymousAccount> {
  // Step 1: Get authentication options
  const options = await api<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/anonymous/passkey/login/options",
    {
      method: "POST",
      body: { accountCode },
    }
  );

  // Step 2: Authenticate with browser WebAuthn API
  const credential = await startAuthentication({ optionsJSON: options });

  // Step 3: Verify with server
  const result = await api<{ accessToken: string; accountCode: string }>(
    "/auth/anonymous/passkey/login/verify",
    {
      method: "POST",
      body: { accountCode, response: credential },
    }
  );

  return {
    accountCode: result.accountCode,
    accessToken: result.accessToken,
    visitorToken: "",
    hasPasskey: true,
  };
}
