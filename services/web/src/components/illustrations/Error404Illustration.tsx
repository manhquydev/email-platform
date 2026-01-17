/**
 * 404 Not Found Illustration
 * Concept: Lost astronaut floating in space with question marks
 * Glassmorphism-styled SVG matching platform design language
 */

interface IllustrationProps {
  className?: string;
  size?: number;
}

export function Error404Illustration({ className, size = 200 }: IllustrationProps) {
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

      {/* Floating question marks */}
      <text x="40" y="50" fontSize="24" fill="currentColor" fillOpacity="0.3" fontFamily="system-ui">?</text>
      <text x="150" y="70" fontSize="18" fill="currentColor" fillOpacity="0.2" fontFamily="system-ui">?</text>
      <text x="160" y="140" fontSize="20" fill="currentColor" fillOpacity="0.25" fontFamily="system-ui">?</text>

      {/* Magnifying glass - main element */}
      <g transform="translate(60, 55)">
        {/* Glass circle */}
        <circle
          cx="40"
          cy="40"
          r="35"
          stroke="currentColor"
          strokeWidth="4"
          strokeOpacity="0.8"
          fill="currentColor"
          fillOpacity="0.05"
        />
        {/* Glass shine */}
        <path
          d="M25 25 Q30 20 35 25"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Handle */}
        <line
          x1="65"
          y1="65"
          x2="85"
          y2="85"
          stroke="currentColor"
          strokeWidth="6"
          strokeOpacity="0.8"
          strokeLinecap="round"
        />
      </g>

      {/* 404 text inside magnifying glass */}
      <text
        x="100"
        y="105"
        fontSize="20"
        fontWeight="bold"
        fill="currentColor"
        fillOpacity="0.6"
        textAnchor="middle"
        fontFamily="system-ui"
      >
        404
      </text>

      {/* Decorative dots/stars */}
      <circle cx="35" cy="80" r="2" fill="currentColor" fillOpacity="0.3" />
      <circle cx="165" cy="100" r="3" fill="currentColor" fillOpacity="0.2" />
      <circle cx="50" cy="160" r="2" fill="currentColor" fillOpacity="0.25" />
      <circle cx="155" cy="165" r="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}
