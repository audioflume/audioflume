"use client";

import { usePlayer } from "@/context/PlayerContext";

const VOLUME_ICON_STROKE_WIDTH = 1.1;

type VolumeIconProps = {
  className?: string;
  size?: number;
  muted?: boolean;
};

export default function VolumeIcon({
  className,
  size = 17,
  muted = false,
}: VolumeIconProps) {
  const { volume } = usePlayer();
  const strokeColor = "var(--filmwave-player-action-icon-color, currentColor)";
  const strokeStyle = {
    strokeWidth: VOLUME_ICON_STROKE_WIDTH,
    fill: "none",
  };
  const isMuted = muted || volume === 0;
  const showOuterWave = volume > 0.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
      shapeRendering="geometricPrecision"
    >
      <path
        d="M4 9H7.25L12.5 5V19L7.25 15H4V9Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth={VOLUME_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={strokeStyle}
      />

      {isMuted ? (
        <>
          <path
            d="M16 9L21 15"
            fill="none"
            stroke={strokeColor}
            strokeWidth={VOLUME_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={strokeStyle}
          />
          <path
            d="M21 9L16 15"
            fill="none"
            stroke={strokeColor}
            strokeWidth={VOLUME_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={strokeStyle}
          />
        </>
      ) : (
        <>
          <path
            d="M15.75 9C17.4 10.65 17.4 13.35 15.75 15"
            fill="none"
            stroke={strokeColor}
            strokeWidth={VOLUME_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={strokeStyle}
          />
          {showOuterWave ? (
            <path
              d="M18.5 6.5C21.5 9.5 21.5 14.5 18.5 17.5"
              fill="none"
              stroke={strokeColor}
              strokeWidth={VOLUME_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={strokeStyle}
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
