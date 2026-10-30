import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/owner/employees').then((d) => setEmployees(d.employees)).catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  async function add(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/owner/employees', { method: 'POST', body: form });
      setMessage(`Added ${form.name}. Share their email and password with them.`);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(employee) {
    try {
      await api(`/owner/employees/${employee.id}`, { method: 'PATCH', body: { active: !employee.active } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function resetPassword(employee) {
    const password = window.prompt(`New password for ${employee.name} (at least 8 characters):`);
    if (!password) return;
    try {
      await api(`/owner/employees/${employee.id}`, { method: 'PATCH', body: { password } });
      setMessage(`Password changed for ${employee.name}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <section className="card">
        <h2>Employees</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.active ? 'Active' : 'Disabled'}</td>
                  <td className="row">
                    <button type="button" className="link" onClick={() => toggleActive(e)}>{e.active ? 'Disable' : 'Enable'}</button>
                    <button type="button" className="link" onClick={() => resetPassword(e)}>Reset password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form className="card stack" onSubmit={add}>
        <h2>Add employee</h2>
        <label>Name<input value={form.name} onChange={update('name')} required /></label>
        <label>Email<input type="email" value={form.email} onChange={update('email')} required /></label>
        <label>Password<input value={form.password} onChange={update('password')} required minLength={8} /></label>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">Add employee</button>
      </form>
    </>
  );
}
