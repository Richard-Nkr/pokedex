type PokeballProps = {
  className?: string;
  strokeWidth?: number;
};

export function Pokeball({ className, strokeWidth = 3 }: PokeballProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M4 24h13.5M30.5 24H44"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="24"
        r="6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
