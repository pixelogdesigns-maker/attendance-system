const LABELS = {
  not_checked_in: ['Not checked in', 'muted'],
  active: ['In office', 'good'],
  returned: ['Back in office', 'good'],
  location_uncertain: ['Location uncertain', 'warn'],
  no_recent_update: ['No recent update', 'warn'],
  possible_outside: ['Outside office', 'bad'],
  stopped: ['Checked out', 'muted'],
};

export function statusLabel(display) {
  return (LABELS[display] || [display])[0];
}

export default function StatusBadge({ display }) {
  const [label, tone] = LABELS[display] || [display, 'muted'];
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
