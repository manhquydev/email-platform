/**
 * 403 Forbidden Illustration
 * Concept: Shield with padlock - access denied
 * Glassmorphism-styled SVG matching platform design language
 */

interface IllustrationProps {
  className?: string;
  size?: number;
}

export function Error403Illustration({ className, size = 200 }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background circle with glassmorphism effect */}
      <circle cx="100" cy="100" r="90" fill="currentColor" fillOpacity="0.05" />
      <circle cx="100" cy="100" r="90" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />

      {/* Shield shape */}
      <path
        d="M100 30 L155 55 L155 100 C155 140 130 165 100 180 C70 165 45 140 45 100 L45 55 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.8"
        fill="currentColor"
        fillOpacity="0.08"
        strokeLinejoin="round"
      />

      {/* Inner shield highlight */}
      <path
        d="M100 45 L140 65 L140 100 C140 130 120 150 100 162 C80 150 60 130 60 100 L60 65 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.2"
        fill="none"
      />

      {/* Padlock body */}
      <rect
        x="80"
        y="95"
        width="40"
        height="35"
        rx="4"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.8"
        fill="currentColor"
        fillOpacity="0.1"
      />

      {/* Padlock shackle */}
      <path
        d="M85 95 L85 80 C85 70 90 65 100 65 C110 65 115 70 115 80 L115 95"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Keyhole */}
      <circle cx="100" cy="108" r="5" fill="currentColor" fillOpacity="0.6" />
      <rect x="98" y="110" width="4" height="10" rx="1" fill="currentColor" fillOpacity="0.6" />

      {/* Decorative X marks for denied */}
      <g stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round">
        <line x1="30" y1="45" x2="40" y2="55" />
        <line x1="40" y1="45" x2="30" y2="55" />

        <line x1="160" y1="45" x2="170" y2="55" />
        <line x1="170" y1="45" x2="160" y2="55" />

        <line x1="165" y1="145" x2="175" y2="155" />
        <line x1="175" y1="145" x2="165" y2="155" />
      </g>
    </svg>
  );
}
