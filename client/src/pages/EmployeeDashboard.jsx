import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { getReading, permissionState } from '../services/location.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LiveClock from '../components/LiveClock.jsx';
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
  const usesGps = office?.checkMethod === 'gps';

  // Wi-Fi offices need nothing from the phone: the server checks which network the request came from.
  const presenceBody = useCallback(async () => (usesGps ? getReading() : {}), [usesGps]);

  const load = useCallback(async () => {
    const [today, past] = await Promise.all([api('/attendance/today'), api('/attendance/history')]);
    setRecord(today.record);
    setOffice(today.office);
    setHistory(past.records);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  useEffect(() => {
    if (usesGps) permissionState().then(setPermission);
  }, [usesGps]);

  const monitoring = record && !record.checkOutAt && record.monitoringStatus === 'active';

  // While checked in and this page is open, send a reading at the office's interval.
  const sendReading = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const body = await presenceBody();
      const result = await api('/location-events', { method: 'POST', body });
      setRecord((r) => (r ? { ...r, display: result.display, lastReadingAt: result.accepted ? new Date().toISOString() : r.lastReadingAt } : r));
      setError(
        result.accepted && result.classification === 'outside' && !usesGps
          ? 'You are not on the office Wi-Fi. Connect to it and turn off mobile data.'
          : '',
      );
    } catch (err) {
      setError(err.message);
      if (usesGps) permissionState().then(setPermission);
    } finally {
      sendingRef.current = false;
    }
  }, [presenceBody, usesGps]);

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
    setMessage(usesGps ? 'Getting your location…' : 'Checking the office Wi-Fi…');
    try {
      const body = await presenceBody();
      const data = await api('/attendance/check-in', { method: 'POST', body });
      setRecord(data.record);
      setOffice(data.office);
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
    if (!window.confirm('Check out for today? Attendance checks will stop.')) return;
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
      <section className="hero hero-compact">
        <div className="hero-text">
          <p className="hero-kicker">{office?.name || 'Office Attendance'}</p>
          <LiveClock timeZone={office?.timezone} />
        </div>
        <StatusBadge display={record?.display || 'not_checked_in'} />
      </section>

      <section className="card stack rise">
        <h2>Today</h2>
        {office && (
          <p className="muted">
            {office.name} · work hours {office.monitoringStartLocal} to {office.monitoringEndLocal} ·{' '}
            {usesGps ? `check-in within ${office.radiusMeters} m` : 'check in on the office Wi-Fi'}
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
                <dt>Last check</dt>
                <dd>{lastUpdate === null ? '–' : lastUpdate === 0 ? 'just now' : `${lastUpdate} min ago`}</dd>
              </>
            )}
          </dl>
        ) : null}

        {usesGps && permission === 'denied' && (
          <p className="error">
            Location is blocked for this site. Open your browser's site settings and allow location, then reload.
          </p>
        )}
        {monitoring && (
          <p className="notice">
            {usesGps
              ? 'Keep this page open during work hours so your attendance stays confirmed. Your location is only checked'
              : 'Stay on the office Wi-Fi and keep this page open during work hours. Your connection is only checked'}{' '}
            between {office?.monitoringStartLocal} and {office?.monitoringEndLocal}, and never after you check out.
          </p>
        )}

        {message && (
          <p className="success pop" key={message}>
            {record && !record.checkOutAt && <span className="check-mark" aria-hidden="true">✓</span>}
            {message}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        {!record && (
          <div className="checkin-wrap">
            <button type="button" className={busy ? 'checkin-button busy' : 'checkin-button'} onClick={checkIn} disabled={busy}>
              <span className="checkin-icon" aria-hidden="true">{busy ? '…' : '➜'}</span>
              {busy ? 'Checking…' : 'Check in'}
            </button>
          </div>
        )}
        {monitoring && (
          <div className="row">
            <button type="button" onClick={sendReading} disabled={busy}>Check again now</button>
            <button type="button" className="danger" onClick={checkOut} disabled={busy}>Check out</button>
          </div>
        )}
      </section>

      <section className="card rise" style={{ '--i': 1 }}>
        <h2>My attendance</h2>
        {history.length === 0 ? (
          <p className="muted">No records yet.</p>
        ) : (
          <div className="table-wrap"><table>
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
          </table></div>
        )}
        <p className="muted small">
          Check history and alerts are deleted after 1 month. Updated {formatDateTime(new Date(), office?.timezone)}.
        </p>
      </section>
    </main>
  );
}
