import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './services/api.js';
import LoginPage from './pages/LoginPage.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import Avatar from './components/Avatar.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  function handleLogin(token, loggedInUser) {
    setToken(token);
    setUser(loggedInUser);
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
  }

  if (loading) return <main className="page"><div className="skeleton" /></main>;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <>
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">✓</span>
          Office Attendance
        </span>
        <span className="topbar-user">
          <Avatar name={user.name} size={32} />
          <span className="topbar-name">{user.name}</span>
          <button type="button" className="link" onClick={handleLogout}>Sign out</button>
        </span>
      </header>
      {user.role === 'owner' ? <OwnerDashboard /> : <EmployeeDashboard />}
    </>
  );
}
