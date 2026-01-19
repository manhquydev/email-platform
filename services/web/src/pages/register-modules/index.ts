/**
 * Barrel export for register-modules
 */
export type { RegisterForm, PasswordStrength } from "./register-hooks";
export { registerSchema, getPasswordStrength, useRegisterForm } from "./register-hooks";
export {
    BrandLogo,
    PasswordStrengthIndicator,
    TermsCheckbox,
    TelegramHint,
    RegisterFormInputs,
    SubmitButton,
    HeroSection,
    SecurityBadge,
    LoginLink
} from "./register-components";
