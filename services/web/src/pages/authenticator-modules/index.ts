/**
 * Barrel export for authenticator-modules
 */
export type { AuthenticatorAccount } from "./types";
export { SERVICE_COLORS, getServiceColor } from "./types";
export { useAuthenticatorData } from "./use-authenticator-data";
export type { UseAuthenticatorDataReturn } from "./use-authenticator-data";
export {
    AuthenticatorHeader,
    AuthenticatorLoadingSkeleton,
    EmptyAuthenticatorState,
    OTPCard,
    AddAccountModal
} from "./authenticator-components";
export type {
    AuthenticatorHeaderProps,
    EmptyAuthenticatorStateProps,
    OTPCardProps,
    AddAccountModalProps
} from "./authenticator-components";
