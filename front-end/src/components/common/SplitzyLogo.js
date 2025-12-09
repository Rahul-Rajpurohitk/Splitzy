import React from "react";

/**
 * Refined Splitzy logomark + badge
 * Usage: <SplitzyLogo variant="badge" /> or <SplitzyLogo variant="mark" size={48} />
 */
function SplitzyLogo({ size = 48, variant = "mark" }) {
  const gradId = "splitzy-grad";
  const glowId = "splitzy-glow";

  if (variant === "badge") {
    return (
      <div className="splitzy-badge">
        <SplitzyLogo size={26} />
        <span>Splitzy</span>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#0b1324" />
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="16"
        fill="url(#glowId)"
        opacity="0.4"
      />
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="16"
        fill="url(#gradId)"
        opacity="0.08"
      />
      <path
        d="M20 25c0-2.2 1.8-4 4-4h12c4 0 7 3.2 7 7s-3 7-7 7H24c-2.2 0-4-1.8-4-4v-6Zm0 18c0-2.2 1.8-4 4-4h6c4 0 7 3.2 7 7s-3 7-7 7h-6c-2.2 0-4-1.8-4-4v-6Z"
        fill="#f8fafc"
        opacity="0.9"
      />
      <path
        d="M37 24.5c0-2.5 2-4.5 4.5-4.5S46 22 46 24.5 44 29 41.5 29 37 27 37 24.5Zm-11 22c0-2.5 2-4.5 4.5-4.5S35 44 35 46.5 33 51 30.5 51 26 49 26 46.5Z"
        fill="#f8fafc"
      />
      <circle cx="32" cy="32" r="16" fill="url(#gradId)" opacity="0.08" />
    </svg>
  );
}

export default SplitzyLogo;

