import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { getReading } from '../services/location.js';

const FIELDS = [
  ['name', 'Office name', 'text'],
  ['latitude', 'Latitude', 'number'],
  ['longitude', 'Longitude', 'number'],
  ['radiusMeters', 'Office radius (m)', 'number'],
  ['monitoringStartLocal', 'Work starts (HH:MM)', 'text'],
  ['monitoringEndLocal', 'Work ends (HH:MM)', 'text'],
  ['lateAfterMinutes', 'Late after (minutes past start)', 'number'],
  ['outsideReadingsRequired', 'Outside readings in a row before alert', 'number'],
  ['insideReadingsRequired', 'Inside readings in a row before "returned"', 'number'],
  ['sampleIntervalSeconds', 'Seconds between location checks', 'number'],
  ['maxAcceptedAccuracyMeters', 'Ignore readings less accurate than (m)', 'number'],
  ['noUpdateMinutes', 'Show "no recent update" after (minutes)', 'number'],
];

export default function OfficeSettings() {
  const [office, setOffice] = useState(null);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/owner/offices')
      .then((d) => {
        const first = d.offices[0];
        setOffice(first);
        setForm(first || {});
      })
      .catch((err) => setError(err.message));
  }, []);

  async function useMyLocation() {
    try {
      const r = await getReading();
      setForm({ ...form, latitude: r.latitude, longitude: r.longitude });
      setMessage(`Location captured (accuracy about ${Math.round(r.accuracy)} m). Save to apply.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    const body = {};
    for (const [key, , type] of FIELDS) body[key] = type === 'number' ? Number(form[key]) : form[key];
    body.sendReturnAlerts = Boolean(form.sendReturnAlerts);
    try {
      const d = await api(`/owner/offices/${office._id}`, { method: 'PATCH', body });
      setOffice(d.office);
      setForm(d.office);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !office) return <p className="error">{error}</p>;
  if (!office) return <p className="muted">Loading…</p>;

  return (
    <form className="card stack" onSubmit={save}>
      <h2>Office settings</h2>
      <p className="muted">Timezone: {office.timezone}. Every change is recorded in the audit log.</p>
      {FIELDS.map(([key, label, type]) => (
        <label key={key}>
          {label}
          <input
            type={type}
            step={key === 'latitude' || key === 'longitude' ? 'any' : undefined}
            value={form[key] ?? ''}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            required
          />
        </label>
      ))}
      <label className="inline">
        <input
          type="checkbox"
          checked={Boolean(form.sendReturnAlerts)}
          onChange={(e) => setForm({ ...form, sendReturnAlerts: e.target.checked })}
        />{' '}
        Send a WhatsApp alert when someone returns
      </label>
      <button type="button" onClick={useMyLocation}>Use my current location as the office</button>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit" className="primary">Save settings</button>
    </form>
  );
}
