const HUES = [212, 262, 330, 24, 152, 190, 290, 45];

function hueFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

export default function Avatar({ name, size = 40 }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return (
    <span className="avatar" style={{ '--hue': hueFor(name), width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}
