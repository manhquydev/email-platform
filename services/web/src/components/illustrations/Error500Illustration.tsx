/**
 * 500 Server Error Illustration
 * Concept: Broken gears with glitch effect
 * Glassmorphism-styled SVG matching platform design language
 */

interface IllustrationProps {
  className?: string;
  size?: number;
}

export function Error500Illustration({ className, size = 200 }: IllustrationProps) {
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

      {/* Main broken gear */}
      <g transform="translate(55, 45)">
        {/* Gear teeth */}
        <path
          d="M45 5 L50 0 L55 5 L55 15 L65 20 L70 15 L80 20 L80 30 L90 35 L90 45 L85 50 L90 55 L90 65 L80 70 L80 80 L70 85 L65 80 L55 85 L55 95 L50 100 L45 95 L45 85 L35 80 L30 85 L20 80 L20 70 L10 65 L10 55 L15 50 L10 45 L10 35 L20 30 L20 20 L30 15 L35 20 L45 15 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.7"
          fill="currentColor"
          fillOpacity="0.08"
        />
        {/* Center circle */}
        <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" fill="currentColor" fillOpacity="0.05" />
        <circle cx="50" cy="50" r="8" fill="currentColor" fillOpacity="0.3" />

        {/* Crack/break line */}
        <path
          d="M30 30 L40 45 L35 55 L50 70 L45 85"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Small broken gear piece floating away */}
      <g transform="translate(140, 130) rotate(25)">
        <path
          d="M0 5 L5 0 L10 5 L10 10 L15 12 L15 18 L10 20 L10 25 L5 30 L0 25 L0 20 L-5 18 L-5 12 L0 10 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          fill="currentColor"
          fillOpacity="0.1"
        />
      </g>

      {/* Glitch/error lines */}
      <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="2">
        <line x1="25" y1="60" x2="40" y2="60" />
        <line x1="30" y1="65" x2="50" y2="65" />
        <line x1="155" y1="90" x2="175" y2="90" />
        <line x1="160" y1="95" x2="170" y2="95" />
      </g>

      {/* Warning triangle */}
      <g transform="translate(25, 140)">
        <path
          d="M15 5 L28 28 L2 28 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.6"
          fill="currentColor"
          fillOpacity="0.1"
          strokeLinejoin="round"
        />
        <text x="15" y="24" fontSize="12" fill="currentColor" fillOpacity="0.6" textAnchor="middle" fontFamily="system-ui">!</text>
      </g>

      {/* Scattered dots representing sparks */}
      <circle cx="165" cy="55" r="2" fill="currentColor" fillOpacity="0.4" />
      <circle cx="170" cy="65" r="1.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="45" cy="170" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}
