import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import StatusBadge, { statusTone } from '../components/StatusBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import AttendanceRing from '../components/AttendanceRing.jsx';
import CountUp from '../components/CountUp.jsx';
import LiveClock from '../components/LiveClock.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { formatDateTime, formatTime, minutesAgo } from '../format.js';
import OfficeSettings from './OfficeSettings.jsx';
import EmployeeManager from './EmployeeManager.jsx';
import AttendanceLog from './AttendanceLog.jsx';

const TABS = ['Today', 'Alerts', 'Attendance', 'Employees', 'Settings'];
const EVENT_LABELS = { departure: 'Left office', return: 'Returned', no_update: 'No update' };
const EVENT_TONES = { departure: 'bad', return: 'good', no_update: 'warn' };

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
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div key={tab} className="tab-panel">
        {tab === 'Today' && <TodayView />}
        {tab === 'Alerts' && <AlertsView />}
        {tab === 'Attendance' && <AttendanceLog />}
        {tab === 'Employees' && <EmployeeManager />}
        {tab === 'Settings' && <OfficeSettings />}
      </div>
    </main>
  );
}

function greeting(timeZone) {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function TodayView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    api('/owner/dashboard')
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <Skeleton rows={4} />;

  const tz = data.office.timezone;
  const counts = data.employees.reduce((acc, e) => ({ ...acc, [e.display]: (acc[e.display] || 0) + 1 }), {});
  const present = data.employees.filter((e) => e.checkInAt).length;
  const stats = [
    { label: 'In office now', value: (counts.active || 0) + (counts.returned || 0), tone: 'good', icon: '●' },
    { label: 'Late today', value: data.employees.filter((e) => e.late).length, tone: 'warn', icon: '◷' },
    { label: 'Outside office', value: counts.possible_outside || 0, tone: 'bad', icon: '↗' },
    { label: 'Need checking', value: (counts.no_recent_update || 0) + (counts.location_uncertain || 0), tone: 'muted', icon: '?' },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="hero-kicker">{data.office.name}</p>
          <h1>{greeting(tz)}</h1>
          <LiveClock timeZone={tz} />
        </div>
        <AttendanceRing present={present} total={data.employees.length} />
      </section>

      <section className="summary">
        {stats.map((s, i) => (
          <div key={s.label} className={`stat stat-${s.tone} rise`} style={{ '--i': i }}>
            <span className="stat-icon" aria-hidden="true">{s.icon}</span>
            <span className="stat-value"><CountUp value={s.value} /></span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Team today</h2>
          <button type="button" className={refreshing ? 'icon-button spinning' : 'icon-button'} onClick={load} aria-label="Refresh">
            ↻
          </button>
        </div>
        {data.employees.length === 0 ? (
          <p className="muted">No employees yet. Add them in the Employees tab.</p>
        ) : (
          <ul className="people">
            {data.employees.map((e, i) => {
              const ago = minutesAgo(e.lastReadingAt);
              return (
                <li key={e.id} className={`person person-${statusTone(e.display)} rise`} style={{ '--i': i }}>
                  <Avatar name={e.name} />
                  <div className="person-main">
                    <strong>{e.name}</strong>
                    <span className="muted">
                      {e.checkInAt ? `In ${formatTime(e.checkInAt, tz)}` : 'Not in yet'}
                      {e.late ? ' · late' : ''}
                      {e.checkOutAt ? ` · out ${formatTime(e.checkOutAt, tz)}` : ''}
                      {!e.checkOutAt && ago !== null ? ` · checked ${ago === 0 ? 'just now' : `${ago} min ago`}` : ''}
                      {e.departureCount ? ` · left ${e.departureCount}×` : ''}
                    </span>
                  </div>
                  <StatusBadge display={e.display} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">
          "Outside office" means the phone checked in from outside the office several times in a row (off the office Wi-Fi,
          or outside the GPS area). "No recent update" usually means the page was closed or the phone lost signal; it is not
          counted as leaving. Please confirm with the employee before acting on any alert.
        </p>
      </section>

      <section className="card">
        <h2>Latest alerts</h2>
        <AlertTimeline alerts={data.recentAlerts} tz={tz} />
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
  if (!alerts) return <Skeleton rows={4} />;
  return (
    <section className="card">
      <h2>Alert history (last 1 month)</h2>
      <AlertTimeline alerts={alerts} />
    </section>
  );
}

function whatsappStatus(alert) {
  if (alert.status === 'sent') return 'WhatsApp sent';
  if (alert.status === 'queued') return 'Sending…';
  return alert.failureCode === 'not_configured' ? 'WhatsApp not set up' : `WhatsApp failed (${alert.failureCode})`;
}

function AlertTimeline({ alerts, tz }) {
  if (alerts.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon" aria-hidden="true">✓</span>
        <p className="muted">No alerts. Everyone is where they should be.</p>
      </div>
    );
  }
  return (
    <ol className="timeline">
      {alerts.map((a, i) => (
        <li key={a.id} className={`timeline-item tone-${EVENT_TONES[a.eventType] || 'muted'} rise`} style={{ '--i': i }}>
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{a.employeeName}</strong> · {EVENT_LABELS[a.eventType] || a.eventType}
            <div className="muted small-inline">
              {formatDateTime(a.detectedAt, tz)} · {whatsappStatus(a)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
