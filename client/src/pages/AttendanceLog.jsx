import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatTime } from '../format.js';

// Owner view of past attendance, with corrections that are saved to the audit log.
export default function AttendanceLog() {
  const [records, setRecords] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/owner/attendance').then((d) => setRecords(d.records)).catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!records) return <p className="muted">Loading…</p>;

  return (
    <section className="card">
      <h2>Attendance records</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Employee</th><th>In</th><th>Out</th><th>Status</th><th>Trips out</th><th></th></tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.workDate}</td>
                <td>{r.employeeName}</td>
                <td>{formatTime(r.checkInAt)}</td>
                <td>{formatTime(r.checkOutAt)}</td>
                <td>{r.late ? `${r.status} · late` : r.status}</td>
                <td>{r.departureCount || ''}</td>
                <td><button type="button" className="link" onClick={() => setEditing(r)}>Correct</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <CorrectionForm
          record={editing}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CorrectionForm({ record, onDone }) {
  const [checkInAt, setCheckInAt] = useState(toLocalInput(record.checkInAt));
  const [checkOutAt, setCheckOutAt] = useState(toLocalInput(record.checkOutAt));
  const [late, setLate] = useState(record.late);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      await api(`/owner/attendance/${record.id}`, {
        method: 'PATCH',
        body: {
          checkInAt: new Date(checkInAt).toISOString(),
          checkOutAt: checkOutAt ? new Date(checkOutAt).toISOString() : null,
          late,
          reason,
        },
      });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="stack panel" onSubmit={submit}>
      <h3>Correct {record.employeeName}, {record.workDate}</h3>
      <label>Check-in time<input type="datetime-local" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} required /></label>
      <label>Check-out time<input type="datetime-local" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} /></label>
      <label className="inline"><input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} /> Mark as late</label>
      <label>Reason (saved in the audit log)<input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary">Save correction</button>
        <button type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
