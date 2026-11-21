type WaveformIconProps = {
  size?: number;
  solid?: boolean;
};

export default function WaveformIcon({ size = 14, solid = false }: WaveformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {solid ? (
        <g fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" shapeRendering="crispEdges">
          <path d="M4 9.9a1.1 1.1 0 0 1 1.1 1.1v2a1.1 1.1 0 0 1-2.2 0v-2A1.1 1.1 0 0 1 4 9.9Z" />
          <path d="M8 5.9A1.1 1.1 0 0 1 9.1 7v10a1.1 1.1 0 0 1-2.2 0V7A1.1 1.1 0 0 1 8 5.9Z" />
          <path d="M12 2.9A1.1 1.1 0 0 1 13.1 4v16a1.1 1.1 0 0 1-2.2 0V4A1.1 1.1 0 0 1 12 2.9Z" />
          <path d="M16 6.9A1.1 1.1 0 0 1 17.1 8v8a1.1 1.1 0 0 1-2.2 0V8A1.1 1.1 0 0 1 16 6.9Z" />
          <path d="M20 9.9a1.1 1.1 0 0 1 1.1 1.1v2a1.1 1.1 0 0 1-2.2 0v-2A1.1 1.1 0 0 1 20 9.9Z" />
        </g>
      ) : (
      <>
      <path
        d="M4 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M8 17V7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 20V4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 16V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      </>
      )}
    </svg>
  );
}
