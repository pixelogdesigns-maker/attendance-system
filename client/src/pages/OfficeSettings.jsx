import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { getReading } from '../services/location.js';

const COMMON_FIELDS = [
  ['name', 'Office name', 'text'],
  ['monitoringStartLocal', 'Work starts (HH:MM)', 'text'],
  ['monitoringEndLocal', 'Work ends (HH:MM)', 'text'],
  ['lateAfterMinutes', 'Late after (minutes past start)', 'number'],
  ['outsideReadingsRequired', 'Checks off the office in a row before an alert', 'number'],
  ['insideReadingsRequired', 'Checks back in the office before "returned"', 'number'],
  ['sampleIntervalSeconds', 'Seconds between checks', 'number'],
  ['noUpdateMinutes', 'Show "no recent update" after (minutes)', 'number'],
];

const GPS_FIELDS = [
  ['latitude', 'Latitude', 'number'],
  ['longitude', 'Longitude', 'number'],
  ['radiusMeters', 'Office radius (m)', 'number'],
  ['maxAcceptedAccuracyMeters', 'Ignore readings less accurate than (m)', 'number'],
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

  const saveChanges = useCallback(
    async (body, doneMessage) => {
      setError('');
      try {
        const d = await api(`/owner/offices/${office._id}`, { method: 'PATCH', body });
        setOffice(d.office);
        setForm(d.office);
        setMessage(doneMessage);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [office],
  );

  async function useMyLocation() {
    try {
      const r = await getReading();
      setForm({ ...form, latitude: r.latitude, longitude: r.longitude });
      setMessage(`Location captured (accuracy about ${Math.round(r.accuracy)} m). Save to apply.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function save(event) {
    event.preventDefault();
    const fields = form.checkMethod === 'gps' ? [...COMMON_FIELDS, ...GPS_FIELDS] : COMMON_FIELDS;
    const body = { checkMethod: form.checkMethod, sendReturnAlerts: Boolean(form.sendReturnAlerts) };
    for (const [key, , type] of fields) body[key] = type === 'number' ? Number(form[key]) : form[key];
    saveChanges(body, 'Settings saved.');
  }

  if (error && !office) return <p className="error">{error}</p>;
  if (!office) return <p className="muted">Loading…</p>;

  const usesGps = form.checkMethod === 'gps';

  return (
    <>
      {!usesGps && <OfficeWifi office={office} saveChanges={saveChanges} />}

      <form className="card stack" onSubmit={save}>
        <h2>Office settings</h2>
        <p className="muted">Timezone: {office.timezone}. Every change is recorded in the audit log.</p>
        <label>
          How to confirm someone is at the office
          <select value={form.checkMethod || 'wifi'} onChange={(e) => setForm({ ...form, checkMethod: e.target.value })}>
            <option value="wifi">Connected to the office Wi-Fi</option>
            <option value="gps">Phone GPS inside the office area</option>
          </select>
        </label>
        {[...COMMON_FIELDS, ...(usesGps ? GPS_FIELDS : [])].map(([key, label, type]) => (
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
        {usesGps && <button type="button" onClick={useMyLocation}>Use my current location as the office</button>}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">Save settings</button>
      </form>
    </>
  );
}

function OfficeWifi({ office, saveChanges }) {
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api('/owner/network').then(setNetwork).catch((err) => setError(err.message));
  }, []);
  useEffect(refresh, [refresh, office]);

  async function addCurrent() {
    if (!network?.entry) return;
    const ok = await saveChanges(
      { officeNetworks: [...office.officeNetworks, network.entry] },
      'Office Wi-Fi saved. Employees can now check in when connected to it.',
    );
    if (ok) refresh();
  }

  function remove(entry) {
    if (!window.confirm(`Remove ${entry}? Employees on that network will no longer be able to check in.`)) return;
    saveChanges({ officeNetworks: office.officeNetworks.filter((e) => e !== entry) }, 'Network removed.');
  }

  return (
    <section className="card stack">
      <h2>Office Wi-Fi</h2>
      <p className="muted">
        Employees can only check in while connected to these networks. To add the office Wi-Fi, connect this phone or
        computer to it, turn off mobile data, then tap the button below. If your internet provider changes your address
        (for example after the router restarts), add it again.
      </p>
      {office.officeNetworks.length === 0 ? (
        <p className="error">No office Wi-Fi added yet, so nobody can check in.</p>
      ) : (
        <ul className="plain-list">
          {office.officeNetworks.map((entry) => (
            <li key={entry} className="row-between">
              <code>{entry}</code>
              <button type="button" className="link" onClick={() => remove(entry)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {network && (
        <p className={network.onOfficeNetwork ? 'success' : 'muted'}>
          You are connected from <code>{network.ip}</code>
          {network.onOfficeNetwork ? ', which is an office network.' : ', which is not an office network yet.'}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {network && !network.onOfficeNetwork && network.entry && (
        <button type="button" className="primary" onClick={addCurrent}>Add the network I'm on now as office Wi-Fi</button>
      )}
    </section>
  );
}
