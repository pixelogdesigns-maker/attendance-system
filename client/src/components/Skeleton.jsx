// Shimmering placeholder blocks shown while data loads.
export default function Skeleton({ rows = 3 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ '--i': i }} />
      ))}
    </div>
  );
}
