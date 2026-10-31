import CountUp from './CountUp.jsx';

// Circular progress showing how many employees have checked in. The arc draws in on load.
export default function AttendanceRing({ present, total, size = 132 }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const share = total > 0 ? present / total : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${present} of ${total} checked in`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ '--ring-full': circumference, '--ring-offset': circumference * (1 - share) }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong><CountUp value={present} /></strong>
        <span>of {total} in</span>
      </div>
    </div>
  );
}
