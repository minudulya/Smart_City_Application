import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, apiGet } from '../api';

const ROLE_STYLES = {
  admin:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  merchant: { bg: '#fef9c3', text: '#92400e', border: '#fde68a' },
  citizen:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};
const AVATAR_COLORS = ['#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#d97706','#db2777'];
const avatarColor = id => AVATAR_COLORS[id % AVATAR_COLORS.length];
const initials = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
const fmtDate  = d => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

export default function Users() {
  const { user: me } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('All');
  const [pendingRole, setPendingRole] = useState({});
  const [confirm,     setConfirm]     = useState(null);
  const [toast,       setToast]       = useState('');
  const [error,       setError]       = useState('');

  useEffect(() => {
    apiGet('/api/users')
      .then(d => { if (Array.isArray(d)) setUsers(d); })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const stats = {
    total:    users.length,
    admin:    users.filter(u => u.role === 'admin').length,
    merchant: users.filter(u => u.role === 'merchant').length,
    citizen:  users.filter(u => u.role === 'citizen').length,
  };

  const visible = users.filter(u => {
    const matchRole   = filter === 'All' || u.role === filter.toLowerCase();
    const matchSearch = !search || [u.name, u.email, u.username]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchRole && matchSearch;
  });

  const saveRole = async id => {
    const newRole = pendingRole[id];
    if (!newRole) return;
    try {
      const updated = await api(`/api/users/${id}/role`, { method: 'PUT', body: { role: newRole } });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setPendingRole(prev => { const n = { ...prev }; delete n[id]; return n; });
      showToast('Role updated successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async id => {
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      setConfirm(null);
      showToast('User deleted.');
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    }
  };

  const confirmTarget = users.find(u => u.id === confirm);

  return (
    <>
      <style>{CSS}</style>
      <div className="usr-wrap">

        {/* Stats row */}
        <div className="usr-stats">
          {[
            { label: 'Total Users', value: stats.total,    icon: '👥', color: '#2563eb', bg: '#eff6ff' },
            { label: 'Admins',      value: stats.admin,    icon: '🛠️', color: '#9333ea', bg: '#fdf4ff' },
            { label: 'Merchants',   value: stats.merchant, icon: '🏪', color: '#d97706', bg: '#fef9c3' },
            { label: 'Citizens',    value: stats.citizen,  icon: '👤', color: '#16a34a', bg: '#f0fdf4' },
          ].map(s => (
            <div className="usr-stat-card" key={s.label}>
              <div className="usr-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div className="usr-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="usr-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="usr-toolbar">
          <input
            className="usr-search"
            placeholder="Search by name, email or username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="usr-chips">
            {['All', 'Admin', 'Merchant', 'Citizen'].map(f => (
              <button
                key={f}
                className={`usr-chip${filter === f ? ' usr-chip-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="usr-error">{error}</div>}

        {/* Table */}
        {loading ? (
          <div className="usr-empty">Loading users…</div>
        ) : visible.length === 0 ? (
          <div className="usr-empty">
            <div className="usr-empty-icon">👥</div>
            <p>No users found.</p>
          </div>
        ) : (
          <div className="usr-table-wrap">
            <table className="usr-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(u => {
                  const rs      = ROLE_STYLES[u.role] ?? ROLE_STYLES.citizen;
                  const isSelf  = u.id === me?.id;
                  const pending = pendingRole[u.id];
                  const isDirty = pending && pending !== u.role;

                  return (
                    <tr key={u.id} className={isSelf ? 'usr-self' : ''}>
                      {/* Name + avatar */}
                      <td>
                        <div className="usr-user-cell">
                          <div className="usr-avatar" style={{ background: avatarColor(u.id) }}>
                            {initials(u.name)}
                          </div>
                          <div>
                            <p className="usr-name">{u.name}</p>
                            {isSelf && <span className="usr-you">You</span>}
                          </div>
                        </div>
                      </td>

                      <td className="usr-muted">@{u.username}</td>
                      <td className="usr-muted">{u.email}</td>
                      <td className="usr-muted">{fmtDate(u.created_at)}</td>

                      {/* Role cell */}
                      <td>
                        {isSelf ? (
                          <span className="usr-role-pill" style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}>
                            {u.role}
                          </span>
                        ) : (
                          <select
                            className="usr-role-select"
                            value={pending ?? u.role}
                            onChange={e => setPendingRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                            style={{ borderColor: isDirty ? '#3b82f6' : '#e2e8f0', color: ROLE_STYLES[pending ?? u.role]?.text ?? '#374151' }}
                          >
                            <option value="citizen">citizen</option>
                            <option value="merchant">merchant</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="usr-actions">
                          {!isSelf && isDirty && (
                            <button className="usr-btn usr-btn-save" onClick={() => saveRole(u.id)}>
                              Save
                            </button>
                          )}
                          {!isSelf && (
                            <button className="usr-btn usr-btn-delete" onClick={() => setConfirm(u.id)}>
                              Delete
                            </button>
                          )}
                          {isSelf && <span className="usr-muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete confirmation modal */}
        {confirm !== null && (
          <div className="usr-modal-bg" onClick={() => setConfirm(null)}>
            <div className="usr-modal" onClick={e => e.stopPropagation()}>
              <h3 className="usr-modal-title">Delete User</h3>
              <p className="usr-modal-body">
                Are you sure you want to delete <strong>{confirmTarget?.name}</strong> (@{confirmTarget?.username})?
                This cannot be undone.
              </p>
              <div className="usr-modal-actions">
                <button className="usr-btn usr-btn-cancel" onClick={() => setConfirm(null)}>Cancel</button>
                <button className="usr-btn usr-btn-confirm-delete" onClick={() => deleteUser(confirm)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <div className="usr-toast">{toast}</div>}
      </div>
    </>
  );
}

const CSS = `
  .usr-wrap { padding: 8px 0 48px; }

  /* Stats */
  .usr-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  @media(max-width:900px){ .usr-stats{ grid-template-columns:repeat(2,1fr); } }
  .usr-stat-card { background:#fff; border:1.5px solid #e8edf3; border-radius:14px; padding:20px; display:flex; flex-direction:column; gap:8px; transition:box-shadow .18s; }
  .usr-stat-card:hover { box-shadow:0 4px 18px rgba(15,23,42,.07); }
  .usr-stat-icon  { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; }
  .usr-stat-value { font-size:2.4rem; font-weight:800; line-height:1; }
  .usr-stat-label { font-size:0.95rem; color:#64748b; }

  /* Toolbar */
  .usr-toolbar { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:20px; align-items:center; }
  .usr-search { flex:1; min-width:220px; padding:10px 14px; font-size:0.975rem; border:1.5px solid #e2e8f0; border-radius:9px; outline:none; font-family:inherit; transition:border-color .15s; }
  .usr-search:focus { border-color:#3b82f6; }
  .usr-chips { display:flex; gap:7px; flex-wrap:wrap; }
  .usr-chip { padding:7px 14px; font-size:0.9rem; font-weight:500; background:#fff; color:#475569; border:1.5px solid #e2e8f0; border-radius:20px; cursor:pointer; transition:all .15s; }
  .usr-chip:hover { border-color:#93c5fd; color:#1e40af; }
  .usr-chip-active { background:#1e3a5f !important; color:#fff !important; border-color:transparent !important; }

  /* Table */
  .usr-table-wrap { background:#fff; border:1.5px solid #e8edf3; border-radius:14px; overflow:hidden; }
  .usr-table { width:100%; border-collapse:collapse; }
  .usr-table thead tr { background:#f8fafc; border-bottom:1.5px solid #e8edf3; }
  .usr-table th { padding:13px 18px; text-align:left; font-size:0.825rem; font-weight:700; color:#64748b; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
  .usr-table td { padding:14px 18px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
  .usr-table tbody tr:last-child td { border-bottom:none; }
  .usr-table tbody tr:hover { background:#fafbfc; }
  .usr-table tbody tr.usr-self { background:#fffbeb; }
  .usr-table tbody tr.usr-self:hover { background:#fef9c3; }

  /* User cell */
  .usr-user-cell { display:flex; align-items:center; gap:11px; }
  .usr-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.875rem; font-weight:700; color:#fff; flex-shrink:0; }
  .usr-name { font-size:1rem; font-weight:600; color:#1e293b; margin:0; }
  .usr-you { font-size:0.75rem; font-weight:600; background:#fef9c3; color:#92400e; padding:1px 6px; border-radius:4px; margin-top:2px; display:inline-block; }
  .usr-muted { font-size:0.9rem; color:#94a3b8; }

  /* Role */
  .usr-role-pill { font-size:0.825rem; font-weight:600; padding:4px 10px; border-radius:6px; white-space:nowrap; }
  .usr-role-select { padding:6px 10px; font-size:0.9rem; font-weight:500; border:1.5px solid #e2e8f0; border-radius:7px; outline:none; font-family:inherit; cursor:pointer; transition:border-color .15s; background:#fff; }
  .usr-role-select:focus { border-color:#3b82f6; }

  /* Actions */
  .usr-actions { display:flex; gap:7px; align-items:center; }
  .usr-btn { font-size:0.875rem; font-weight:600; padding:6px 13px; border:none; border-radius:7px; cursor:pointer; transition:all .15s; white-space:nowrap; }
  .usr-btn-save   { background:#dbeafe; color:#1e40af; }
  .usr-btn-save:hover   { background:#bfdbfe; }
  .usr-btn-delete { background:#fee2e2; color:#dc2626; }
  .usr-btn-delete:hover { background:#fecaca; }
  .usr-btn-cancel { background:#f1f5f9; color:#475569; }
  .usr-btn-cancel:hover { background:#e2e8f0; }
  .usr-btn-confirm-delete { background:#dc2626; color:#fff; }
  .usr-btn-confirm-delete:hover { background:#b91c1c; }

  /* States */
  .usr-empty { text-align:center; padding:80px 24px; color:#94a3b8; font-size:1.05rem; }
  .usr-empty-icon { font-size:3.5rem; margin-bottom:12px; }
  .usr-error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:9px; padding:12px 16px; margin-bottom:16px; font-size:0.95rem; }

  /* Modal */
  .usr-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .usr-modal { background:#fff; border-radius:16px; padding:28px; width:420px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .usr-modal-title { font-size:1.2rem; font-weight:700; color:#0f172a; margin:0 0 12px; }
  .usr-modal-body  { font-size:1rem; color:#475569; margin:0 0 24px; line-height:1.6; }
  .usr-modal-actions { display:flex; gap:10px; justify-content:flex-end; }

  /* Toast */
  .usr-toast { position:fixed; bottom:28px; right:28px; background:#1e293b; color:#fff; padding:12px 20px; border-radius:10px; font-size:0.95rem; font-weight:500; box-shadow:0 8px 24px rgba(0,0,0,.2); z-index:2000; animation:usr-toast-in .25s ease; }
  @keyframes usr-toast-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

  @media(max-width:768px){
    .usr-table th:nth-child(3), .usr-table td:nth-child(3),
    .usr-table th:nth-child(4), .usr-table td:nth-child(4) { display:none; }
  }
`;
