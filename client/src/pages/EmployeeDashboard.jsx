import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { getReading, permissionState } from '../services/location.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime, formatTime, minutesAgo } from '../format.js';

export default function EmployeeDashboard() {
  const [record, setRecord] = useState(null);
  const [office, setOffice] = useState(null);
  const [history, setHistory] = useState([]);
  const [permission, setPermission] = useState('unknown');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    const [today, past] = await Promise.all([api('/attendance/today'), api('/attendance/history')]);
    setRecord(today.record);
    setOffice(today.office);
    setHistory(past.records);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
    permissionState().then(setPermission);
  }, [load]);

  const monitoring = record && !record.checkOutAt && record.monitoringStatus === 'active';

  // While checked in and this page is open, send a reading at the office's interval.
  const sendReading = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const reading = await getReading();
      const result = await api('/location-events', { method: 'POST', body: reading });
      setRecord((r) => (r ? { ...r, display: result.display, lastReadingAt: result.accepted ? new Date().toISOString() : r.lastReadingAt } : r));
      setPermission('granted');
      setError('');
    } catch (err) {
      setError(err.message);
      permissionState().then(setPermission);
    } finally {
      sendingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!monitoring || !office) return undefined;
    const timer = setInterval(sendReading, office.sampleIntervalSeconds * 1000);
    const onVisible = () => document.visibilityState === 'visible' && sendReading();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [monitoring, office, sendReading]);

  async function checkIn() {
    setBusy(true);
    setError('');
    setMessage('Getting your location…');
    try {
      const reading = await getReading();
      const data = await api('/attendance/check-in', { method: 'POST', body: reading });
      setRecord(data.record);
      setOffice(data.office);
      setPermission('granted');
      setMessage(data.record.late ? 'Checked in (late).' : 'Checked in. Have a good day!');
      load().catch(() => {});
    } catch (err) {
      setMessage('');
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    if (!window.confirm('Check out for today? Location monitoring will stop.')) return;
    setBusy(true);
    setError('');
    try {
      const data = await api('/attendance/check-out', { method: 'POST' });
      setRecord(data.record);
      setMessage('Checked out. See you tomorrow.');
      load().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const lastUpdate = minutesAgo(record?.lastReadingAt);

  return (
    <main className="page narrow">
      <section className="card stack">
        <div className="row-between">
          <h2>Today</h2>
          <StatusBadge display={record?.display || 'not_checked_in'} />
        </div>
        {office && (
          <p className="muted">
            {office.name} · work hours {office.monitoringStartLocal} to {office.monitoringEndLocal} · check-in within{' '}
            {office.radiusMeters} m
          </p>
        )}

        {record ? (
          <dl className="facts">
            <dt>Checked in</dt>
            <dd>{formatTime(record.checkInAt, office?.timezone)}{record.late ? ' (late)' : ''}</dd>
            <dt>Checked out</dt>
            <dd>{formatTime(record.checkOutAt, office?.timezone)}</dd>
            {monitoring && (
              <>
                <dt>Last location update</dt>
                <dd>{lastUpdate === null ? '–' : lastUpdate === 0 ? 'just now' : `${lastUpdate} min ago`}</dd>
              </>
            )}
          </dl>
        ) : null}

        {permission === 'denied' && (
          <p className="error">
            Location is blocked for this site. Open your browser's site settings and allow location, then reload.
          </p>
        )}
        {monitoring && (
          <p className="notice">
            Keep this page open during work hours so your attendance stays confirmed. Your location is only checked
            between {office?.monitoringStartLocal} and {office?.monitoringEndLocal}, and never after you check out.
          </p>
        )}

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        {!record && (
          <button type="button" className="primary big" onClick={checkIn} disabled={busy}>
            {busy ? 'Checking…' : 'Check in'}
          </button>
        )}
        {monitoring && (
          <div className="row">
            <button type="button" onClick={sendReading} disabled={busy}>Update location now</button>
            <button type="button" className="danger" onClick={checkOut} disabled={busy}>Check out</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>My attendance</h2>
        {history.length === 0 ? (
          <p className="muted">No records yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>In</th><th>Out</th><th>Note</th></tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td>{r.workDate}</td>
                  <td>{formatTime(r.checkInAt, office?.timezone)}</td>
                  <td>{formatTime(r.checkOutAt, office?.timezone)}</td>
                  <td>{[r.late && 'Late', r.departureCount > 0 && `Left ${r.departureCount}×`].filter(Boolean).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          Location readings and alerts are deleted after 1 month. Updated {formatDateTime(new Date(), office?.timezone)}.
        </p>
      </section>
    </main>
  );
}
