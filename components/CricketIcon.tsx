export function CricketIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="54" cy="22" r="11" fill="currentColor" />
      <path
        d="M54 11.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z"
        fill="white"
        opacity="0.3"
      />
      <path
        d="M49 22c0-2.8 2.2-5 5-5M54 17v10"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M14 66 C14 66 18 58 28 46 C38 34 48 26 56 22"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 70 L18 62"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M48 24 C52 22 58 24 60 30 C62 36 58 42 52 44 C46 46 40 42 38 36 C36 30 40 26 48 24Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
