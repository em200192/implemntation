import { useEffect, useMemo, useState } from 'react';

const sections = [
  { label: 'Clients', roles: ['employee', 'manager'] },
  { label: 'Plans', roles: ['employee', 'manager'] },
  { label: 'Work Sessions', roles: ['employee', 'manager'] },
  { label: 'Approvals', roles: ['manager'] },
  { label: 'Reports', roles: ['manager'] },
  { label: 'Audit Log', roles: ['manager'] }
];

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

export default function App() {
  const [active, setActive] = useState(sections[0].label);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }),
    [token]
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchJson(`${apiUrl}/api/auth/me`, { headers })
      .then(setUser)
      .catch(() => setUser(null));
  }, [token, headers]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    try {
      const data = await fetchJson(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  const availableSections = sections.filter((section) =>
    user ? section.roles.includes(user.role) : false
  );

  useEffect(() => {
    if (availableSections.length && !availableSections.find((section) => section.label === active)) {
      setActive(availableSections[0].label);
    }
  }, [availableSections, active]);

  return (
    <div className="app">
      <aside>
        <h1>Implementation Tracker</h1>
        <p className="subtitle">Single-tenant delivery operations</p>
        <nav>
          {availableSections.map((section) => (
            <button
              key={section.label}
              className={section.label === active ? 'active' : ''}
              onClick={() => setActive(section.label)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        {user ? (
          <div className="user">
            <p>{user.name}</p>
            <span>{user.role}</span>
            <button onClick={logout}>Sign out</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="login">
            <h2>Sign in</h2>
            <input name="email" placeholder="email" required />
            <input name="password" placeholder="password" type="password" required />
            {error && <p className="error">{error}</p>}
            <button type="submit">Login</button>
          </form>
        )}
      </aside>
      <main>
        {token ? (
          <SectionView
            active={active}
            headers={headers}
            setError={setError}
            apiUrl={apiUrl}
            user={user}
          />
        ) : (
          <div className="empty">
            <h2>Welcome back</h2>
            <p>Use a seeded account to sign in and manage implementation activity.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const SectionView = ({ active, headers, apiUrl, setError, user }) => {
  switch (active) {
    case 'Clients':
      return <Clients headers={headers} apiUrl={apiUrl} setError={setError} />;
    case 'Plans':
      return <Plans headers={headers} apiUrl={apiUrl} setError={setError} />;
    case 'Approvals':
      return <Approvals headers={headers} apiUrl={apiUrl} setError={setError} />;
    case 'Work Sessions':
      return <WorkSessions headers={headers} apiUrl={apiUrl} setError={setError} />;
    case 'Reports':
      return <Reports headers={headers} apiUrl={apiUrl} />;
    case 'Audit Log':
      return <AuditLog headers={headers} apiUrl={apiUrl} />;
    default:
      return <div />;
  }
};

const Clients = ({ headers, apiUrl, setError }) => {
  const [clients, setClients] = useState([]);

  const load = () => {
    fetchJson(`${apiUrl}/api/clients`, { headers })
      .then(setClients)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    await fetchJson(`${apiUrl}/api/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    event.target.reset();
    load();
  };

  return (
    <section>
      <header>
        <h2>Clients</h2>
      </header>
      <form className="card" onSubmit={handleCreate}>
        <h3>New client</h3>
        <div className="grid">
          <input name="name" placeholder="Client name" required />
          <input name="contact_person" placeholder="Contact person" />
          <input name="phone" placeholder="Phone" />
          <input name="email" placeholder="Email" type="email" />
        </div>
        <button type="submit">Create</button>
      </form>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.contact_person}</td>
                <td>{client.phone}</td>
                <td>{client.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const Plans = ({ headers, apiUrl, setError }) => {
  const [plans, setPlans] = useState([]);

  const load = () => {
    fetchJson(`${apiUrl}/api/plans`, { headers })
      .then(setPlans)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (planId) => {
    await fetchJson(`${apiUrl}/api/plans/${planId}/submit`, { method: 'POST', headers });
    load();
  };

  return (
    <section>
      <header>
        <h2>Implementation Plans</h2>
      </header>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Estimated (hrs)</th>
              <th>Created by</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.client_name}</td>
                <td>{plan.status}</td>
                <td>{plan.total_estimated_duration}</td>
                <td>{plan.created_by_name}</td>
                <td>
                  {plan.status === 'Draft' && (
                    <button onClick={() => handleSubmit(plan.id)}>Submit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const Approvals = ({ headers, apiUrl, setError }) => {
  const [queue, setQueue] = useState({ plans: [], extensions: [] });

  const load = () => {
    fetchJson(`${apiUrl}/api/approvals/queue`, { headers })
      .then(setQueue)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (planId, action) => {
    await fetchJson(`${apiUrl}/api/approvals/plans/${planId}/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Reviewed in dashboard' })
    });
    load();
  };

  return (
    <section>
      <header>
        <h2>Manager Approval Queue</h2>
      </header>
      <div className="card">
        <h3>Plans awaiting approval</h3>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Estimated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.client_name}</td>
                <td>{plan.status}</td>
                <td>{plan.total_estimated_duration}</td>
                <td>
                  <button onClick={() => handleAction(plan.id, 'approve')}>Approve</button>
                  <button className="ghost" onClick={() => handleAction(plan.id, 'reject')}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Extension requests</h3>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Requested</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {queue.extensions.map((item) => (
              <tr key={item.id}>
                <td>{item.client_name}</td>
                <td>{item.requested_duration} hrs</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const WorkSessions = ({ headers, apiUrl, setError }) => {
  const [planId, setPlanId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [summary, setSummary] = useState({ completed_today: '', pending_next: '', blockers: '' });

  const startSession = async () => {
    const data = await fetchJson(`${apiUrl}/api/sessions/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan_id: Number(planId) })
    });
    setSessionId(data.session_id);
  };

  const verifyOtp = async () => {
    await fetchJson(`${apiUrl}/api/sessions/${sessionId}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ otp })
    });
    setOtp('');
  };

  const endSession = async () => {
    await fetchJson(`${apiUrl}/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers,
      body: JSON.stringify(summary)
    });
  };

  return (
    <section>
      <header>
        <h2>Work Sessions</h2>
      </header>
      <div className="card">
        <h3>Start Session</h3>
        <div className="grid">
          <input
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            placeholder="Approved plan ID"
          />
          <button onClick={startSession}>Send OTP</button>
        </div>
        {sessionId && (
          <p className="muted">Session {sessionId} pending OTP verification.</p>
        )}
      </div>
      <div className="card">
        <h3>Verify OTP</h3>
        <div className="grid">
          <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="Session ID" />
          <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="OTP" />
          <button onClick={verifyOtp}>Verify</button>
        </div>
      </div>
      <div className="card">
        <h3>End-of-day summary</h3>
        <div className="grid">
          <input
            placeholder="Completed today"
            value={summary.completed_today}
            onChange={(event) => setSummary({ ...summary, completed_today: event.target.value })}
          />
          <input
            placeholder="Pending next"
            value={summary.pending_next}
            onChange={(event) => setSummary({ ...summary, pending_next: event.target.value })}
          />
          <input
            placeholder="Blockers"
            value={summary.blockers}
            onChange={(event) => setSummary({ ...summary, blockers: event.target.value })}
          />
        </div>
        <button onClick={endSession}>End session & send summary</button>
      </div>
    </section>
  );
};

const Reports = ({ headers, apiUrl }) => {
  const [planReports, setPlanReports] = useState([]);
  const [staffReports, setStaffReports] = useState([]);

  useEffect(() => {
    fetchJson(`${apiUrl}/api/reports/plans`, { headers }).then(setPlanReports).catch(() => {});
    fetchJson(`${apiUrl}/api/reports/staff`, { headers }).then(setStaffReports).catch(() => {});
  }, []);

  return (
    <section>
      <header>
        <h2>Reports dashboard</h2>
      </header>
      <div className="card">
        <h3>Planned vs actual</h3>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Estimated</th>
              <th>Actual</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {planReports.map((row) => (
              <tr key={row.id}>
                <td>{row.client_name}</td>
                <td>{row.total_estimated_duration}</td>
                <td>{row.actual_time_spent}</td>
                <td>{Math.round(row.avg_progress || 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Staff performance</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Sessions</th>
              <th>Actual hours</th>
            </tr>
          </thead>
          <tbody>
            {staffReports.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.role}</td>
                <td>{row.sessions_count}</td>
                <td>{row.actual_time_spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const AuditLog = ({ headers, apiUrl }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchJson(`${apiUrl}/api/audit`, { headers }).then(setLogs).catch(() => {});
  }, []);

  return (
    <section>
      <header>
        <h2>Audit log</h2>
      </header>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.user_name}</td>
                <td>{log.action}</td>
                <td>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
