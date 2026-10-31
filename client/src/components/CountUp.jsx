import { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts from the previous value up to `value`, easing out over `duration` ms.
export default function CountUp({ value, duration = 800 }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  const shownRef = useRef(shown);

  useEffect(() => {
    if (reducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }
    const from = shownRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{shown}</>;
}
