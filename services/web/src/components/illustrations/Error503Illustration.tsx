/**
 * 503 Service Unavailable Illustration
 * Concept: Construction/maintenance with tools
 * Glassmorphism-styled SVG matching platform design language
 */

interface IllustrationProps {
  className?: string;
  size?: number;
}

export function Error503Illustration({ className, size = 200 }: IllustrationProps) {
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

      {/* Construction barrier/cone */}
      <g transform="translate(70, 100)">
        {/* Cone body */}
        <path
          d="M30 0 L45 60 L15 60 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.8"
          fill="currentColor"
          fillOpacity="0.1"
          strokeLinejoin="round"
        />
        {/* Cone stripes */}
        <line x1="26" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="3" strokeOpacity="0.5" />
        <line x1="23" y1="35" x2="37" y2="35" stroke="currentColor" strokeWidth="3" strokeOpacity="0.5" />
        <line x1="20" y1="50" x2="40" y2="50" stroke="currentColor" strokeWidth="3" strokeOpacity="0.5" />
        {/* Base */}
        <rect x="10" y="60" width="40" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      </g>

      {/* Wrench tool */}
      <g transform="translate(40, 45) rotate(-30)">
        {/* Handle */}
        <rect x="10" y="25" width="8" height="50" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" />
        {/* Head */}
        <path
          d="M0 10 L5 0 L23 0 L28 10 L23 20 L18 20 L18 25 L10 25 L10 20 L5 20 Z"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.7"
        />
        {/* Opening */}
        <rect x="10" y="5" width="8" height="12" fill="currentColor" fillOpacity="0.05" />
      </g>

      {/* Progress bar indicating work in progress */}
      <g transform="translate(50, 175)">
        {/* Background */}
        <rect x="0" y="0" width="100" height="8" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
        {/* Progress fill */}
        <rect x="2" y="2" width="45" height="4" rx="2" fill="currentColor" fillOpacity="0.4" />
        {/* Animated dots */}
        <circle cx="55" cy="4" r="2" fill="currentColor" fillOpacity="0.3" />
        <circle cx="65" cy="4" r="2" fill="currentColor" fillOpacity="0.2" />
        <circle cx="75" cy="4" r="2" fill="currentColor" fillOpacity="0.1" />
      </g>

      {/* Gear in corner - showing system is being worked on */}
      <g transform="translate(140, 40)">
        <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" fill="currentColor" fillOpacity="0.05" />
        <circle cx="20" cy="20" r="5" fill="currentColor" fillOpacity="0.3" />
        {/* Gear teeth simplified */}
        <g stroke="currentColor" strokeWidth="2" strokeOpacity="0.4">
          <line x1="20" y1="2" x2="20" y2="8" />
          <line x1="20" y1="32" x2="20" y2="38" />
          <line x1="2" y1="20" x2="8" y2="20" />
          <line x1="32" y1="20" x2="38" y2="20" />
        </g>
      </g>

      {/* Clock indicator - temporary */}
      <g transform="translate(145, 130)">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" fill="currentColor" fillOpacity="0.05" />
        <line x1="20" y1="20" x2="20" y2="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" strokeLinecap="round" />
        <line x1="20" y1="20" x2="28" y2="24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2" fill="currentColor" fillOpacity="0.5" />
      </g>
    </svg>
  );
}
