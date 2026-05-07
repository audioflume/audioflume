export default function LoadingSpinner({
  size = 28,
  stroke = 9,
  color = 'var(--text-primary)',
  trackColor = 'transparent',
}: {
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
}) {
  const radius = 50 - stroke * 2
  const circumference = 2 * Math.PI * radius
  const visibleArc = circumference * 0.72
  const gapArc = circumference - visibleArc

  return (
    <>
      <style>{`
        @keyframes loading-spinner-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div
        aria-label="Loading"
        role="status"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          style={{
            animation: 'loading-spinner-rotate 0.8s linear infinite',
            overflow: 'visible',
          }}
        >
          {trackColor !== 'transparent' && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={stroke}
            />
          )}

          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${visibleArc} ${gapArc}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
      </div>
    </>
  )
}