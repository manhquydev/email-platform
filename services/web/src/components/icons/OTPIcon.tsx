/**
 * OTPIcon - SVG icon for OTP/verification codes
 * Replaces emoji 🔢 with proper scalable icon
 */

interface OTPIconProps {
    className?: string;
    size?: number;
}

export function OTPIcon({ className = "w-6 h-6", size }: OTPIconProps) {
    const sizeProps = size ? { width: size, height: size } : {};

    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            {...sizeProps}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
        </svg>
    );
}

export default OTPIcon;
