import { useEffect, useState } from 'react';

export default function LiveClock({ timeZone = 'Asia/Kolkata' }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
  const date = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <div className="clock">
      <span className="clock-time">{time}</span>
      <span className="clock-date">{date}</span>
    </div>
  );
}
