import { cn } from "@/lib/utils";

interface AltoLogoProps {
  /** Mark height in px. Wordmark scales off this. */
  size?: number;
  /** When true, renders the lockup (mark + "alto" text). Default: mark only. */
  wordmark?: boolean;
  /** Override the wordmark color. Defaults to currentColor. */
  textClassName?: string;
  className?: string;
}

/**
 * Alto brand mark — a stylized "A" formed by two diagonal strokes meeting
 * at an apex with an opacity-dimmed "speed line" across the middle. The
 * mark lives in a sky-gradient rounded-square; the wordmark uses the
 * site sans (Plus Jakarta) at a tight tracking.
 */
export function AltoLogo({
  size = 32,
  wordmark = false,
  textClassName,
  className,
}: AltoLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="alto-mark-bg"
            x1="0"
            y1="0"
            x2="64"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#alto-mark-bg)" />
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 48 L32 16 L48 48" />
          <path d="M23 38 L41 38" strokeWidth="4" opacity="0.55" />
        </g>
      </svg>
      {wordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight leading-none",
            textClassName,
          )}
          style={{ fontSize: `${size * 0.7}px` }}
        >
          alto
        </span>
      )}
    </div>
  );
}
