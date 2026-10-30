export function formatTime(value, timeZone = 'Asia/Kolkata') {
  if (!value) return '–';
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(
    new Date(value),
  );
}

export function formatDateTime(value, timeZone = 'Asia/Kolkata') {
  if (!value) return '–';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

export function minutesAgo(value) {
  if (!value) return null;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}
