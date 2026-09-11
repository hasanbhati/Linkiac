import React from 'react';

interface LinkiacSymbolProps {
  size?: number | string;
  className?: string;
  limeColor?: string;
  deepColor?: string;
}

/**
 * Linkiac Interlocking Rings Symbol (Chain Interlock)
 */
export function LinkiacSymbol({
  size = 40,
  className = '',
  limeColor = '#bcd94e',
  deepColor = '#093329',
}: LinkiacSymbolProps) {
  return (
    <svg
      viewBox="5 24 110 76"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Linkiac symbol"
    >
      <g transform="translate(15, 25)">
        {/* Right Ring */}
        <rect
          x="35"
          y="10"
          width="55"
          height="55"
          rx="27.5"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
        />
        {/* Left Ring */}
        <rect
          x="0"
          y="10"
          width="55"
          height="55"
          rx="27.5"
          fill="none"
          stroke={limeColor}
          strokeWidth="14"
        />
        {/* Interlock Overlap */}
        <path
          d="M 35 37.5 A 27.5 27.5 0 0 1 62.5 10"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

interface LinkiacLogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol';
  size?: number | string;
  height?: number | string;
  className?: string;
  textColor?: string;
  limeColor?: string;
  deepColor?: string;
}

/**
 * Linkiac Official Brand Logo (Horizontal, Stacked, or Symbol)
 */
export function LinkiacLogo({
  variant = 'horizontal',
  size,
  height,
  className = '',
  textColor = 'currentColor',
  limeColor = '#bcd94e',
  deepColor = '#093329',
}: LinkiacLogoProps) {
  if (variant === 'symbol') {
    return (
      <LinkiacSymbol
        size={size || 40}
        className={className}
        limeColor={limeColor}
        deepColor={deepColor}
      />
    );
  }

  if (variant === 'stacked') {
    const computedHeight = height || size || 80;
    return (
      <svg
        viewBox="50 20 100 145"
        height={computedHeight}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Linkiac logo"
      >
        <g transform="translate(55, 30)">
          {/* Right Ring */}
          <rect
            x="35"
            y="10"
            width="55"
            height="55"
            rx="27.5"
            fill="none"
            stroke={deepColor}
            strokeWidth="14"
          />
          {/* Left Ring */}
          <rect
            x="0"
            y="10"
            width="55"
            height="55"
            rx="27.5"
            fill="none"
            stroke={limeColor}
            strokeWidth="14"
          />
          {/* Interlock Overlap */}
          <path
            d="M 35 37.5 A 27.5 27.5 0 0 1 62.5 10"
            fill="none"
            stroke={deepColor}
            strokeWidth="14"
            strokeLinecap="round"
          />
        </g>
        <text
          x="100"
          y="150"
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="800"
          fontSize="42"
          letterSpacing="-1"
          textAnchor="middle"
        >
          <tspan fill={textColor}>Link</tspan>
          <tspan fill={limeColor}>iac</tspan>
        </text>
      </svg>
    );
  }

  // Default: Horizontal
  const computedHeight = height || size || 40;
  return (
    <svg
      viewBox="0 20 340 75"
      height={computedHeight}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Linkiac logo"
    >
      <g transform="translate(10, 20)">
        {/* Right Ring */}
        <rect
          x="35"
          y="10"
          width="55"
          height="55"
          rx="27.5"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
        />
        {/* Left Ring */}
        <rect
          x="0"
          y="10"
          width="55"
          height="55"
          rx="27.5"
          fill="none"
          stroke={limeColor}
          strokeWidth="14"
        />
        {/* Overlap to create chain interlock */}
        <path
          d="M 35 37.5 A 27.5 27.5 0 0 1 62.5 10"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </g>
      <text
        y="75"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="800"
        fontSize="56"
        letterSpacing="-1.5"
      >
        <tspan x="125" fill={textColor}>
          Link
        </tspan>
        <tspan fill={limeColor}>iac</tspan>
      </text>
    </svg>
  );
}

export default LinkiacLogo;
