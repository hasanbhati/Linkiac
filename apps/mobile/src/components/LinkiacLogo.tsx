import React from 'react';
import Svg, { G, Rect, Path, Text as SvgText, TSpan } from 'react-native-svg';

interface LinkiacSymbolProps {
  size?: number;
  limeColor?: string;
  deepColor?: string;
}

/**
 * Linkiac Interlocking Rings Symbol for React Native
 */
export function LinkiacSymbol({
  size = 44,
  limeColor = '#bcd94e',
  deepColor = '#093329',
}: LinkiacSymbolProps) {
  return (
    <Svg viewBox="5 24 110 76" width={size} height={size}>
      <G transform="translate(15, 25)">
        {/* Right Ring */}
        <Rect
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
        <Rect
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
        <Path
          d="M 35 37.5 A 27.5 27.5 0 0 1 62.5 10"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

interface LinkiacLogoProps {
  height?: number;
  textColor?: string;
  limeColor?: string;
  deepColor?: string;
}

/**
 * Linkiac Full Horizontal Brand Logo for React Native
 */
export function LinkiacLogo({
  height = 36,
  textColor = '#ffffff',
  limeColor = '#bcd94e',
  deepColor = '#093329',
}: LinkiacLogoProps) {
  const width = (height / 75) * 340;
  return (
    <Svg viewBox="0 20 340 75" width={width} height={height}>
      <G transform="translate(10, 20)">
        {/* Right Ring */}
        <Rect
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
        <Rect
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
        <Path
          d="M 35 37.5 A 27.5 27.5 0 0 1 62.5 10"
          fill="none"
          stroke={deepColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </G>
      <SvgText y="75" fontWeight="800" fontSize="56" letterSpacing="-1.5">
        <TSpan x="125" fill={textColor}>
          Link
        </TSpan>
        <TSpan fill={limeColor}>iac</TSpan>
      </SvgText>
    </Svg>
  );
}

export default LinkiacLogo;
