import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime, formatTime, minutesAgo } from '../format.js';
import OfficeSettings from './OfficeSettings.jsx';
import EmployeeManager from './EmployeeManager.jsx';
import AttendanceLog from './AttendanceLog.jsx';

const TABS = ['Today', 'Alerts', 'Attendance', 'Employees', 'Settings'];
const EVENT_LABELS = { departure: 'Left office', return: 'Returned', no_update: 'No update' };

export default function OwnerDashboard() {
  const [tab, setTab] = useState('Today');

  return (
    <main className="page">
      <nav className="tabs" aria-label="Owner sections">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className={tab === name ? 'tab active' : 'tab'}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === 'Today' && <TodayView />}
      {tab === 'Alerts' && <AlertsView />}
      {tab === 'Attendance' && <AttendanceLog />}
      {tab === 'Employees' && <EmployeeManager />}
      {tab === 'Settings' && <OfficeSettings />}
    </main>
  );
}

function TodayView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/owner/dashboard')
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const tz = data.office.timezone;
  const counts = data.employees.reduce((acc, e) => ({ ...acc, [e.display]: (acc[e.display] || 0) + 1 }), {});

  return (
    <>
      <section className="summary">
        <div className="stat"><span>{data.employees.filter((e) => e.checkInAt).length}/{data.employees.length}</span>checked in</div>
        <div className="stat"><span>{data.employees.filter((e) => e.late).length}</span>late</div>
        <div className="stat"><span>{counts.possible_outside || 0}</span>outside now</div>
        <div className="stat"><span>{(counts.no_recent_update || 0) + (counts.location_uncertain || 0)}</span>need checking</div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>{data.office.name} · {data.workDate}</h2>
          <button type="button" onClick={load}>Refresh</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Employee</th><th>Status</th><th>In</th><th>Out</th><th>Last update</th><th>Trips out</th></tr>
            </thead>
            <tbody>
              {data.employees.map((e) => {
                const ago = minutesAgo(e.lastReadingAt);
                return (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td><StatusBadge display={e.display} /></td>
                    <td>{formatTime(e.checkInAt, tz)}{e.late ? ' · late' : ''}</td>
                    <td>{formatTime(e.checkOutAt, tz)}</td>
                    <td>{ago === null ? '–' : `${ago} min ago`}</td>
                    <td>{e.departureCount || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          "Outside office" means several reliable GPS readings put the phone outside the office area. "No recent update"
          usually means the page was closed or the phone lost signal; it is not counted as leaving. Please confirm with the
          employee before acting on any alert.
        </p>
      </section>

      <section className="card">
        <h2>Latest alerts</h2>
        <AlertTable alerts={data.recentAlerts} tz={tz} />
      </section>
    </>
  );
}

function AlertsView() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/owner/alerts').then((d) => setAlerts(d.alerts)).catch((err) => setError(err.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!alerts) return <p className="muted">Loading…</p>;
  return (
    <section className="card">
      <h2>Alert history (last 1 month)</h2>
      <AlertTable alerts={alerts} />
    </section>
  );
}

function AlertTable({ alerts, tz }) {
  if (alerts.length === 0) return <p className="muted">No alerts.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>When</th><th>Employee</th><th>Event</th><th>WhatsApp</th></tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{formatDateTime(a.detectedAt, tz)}</td>
              <td>{a.employeeName}</td>
              <td>{EVENT_LABELS[a.eventType] || a.eventType}</td>
              <td>
                {a.status === 'sent' && 'Sent'}
                {a.status === 'queued' && 'Sending…'}
                {a.status === 'failed' && (a.failureCode === 'not_configured' ? 'Not set up' : `Failed (${a.failureCode})`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
