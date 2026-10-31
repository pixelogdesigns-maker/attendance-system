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

export function statusTone(display) {
  return (LABELS[display] || [display, 'muted'])[1];
}

export default function StatusBadge({ display }) {
  const [label, tone] = LABELS[display] || [display, 'muted'];
  const live = display === 'active' || display === 'returned' || display === 'possible_outside';
  return (
    <span className={`badge badge-${tone}`}>
      <span className={live ? 'dot dot-live' : 'dot'} aria-hidden="true" />
      {label}
    </span>
  );
}
