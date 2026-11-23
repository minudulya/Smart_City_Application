import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiGet, apiPost, apiDelete } from '../api';

const STATUS_STYLES = {
  'Open':        { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'In Progress': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'Resolved':    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const CAT_STYLES = {
  infrastructure: { bg: '#eff6ff', text: '#2563eb', icon: '🏗️' },
  roads:          { bg: '#fff7ed', text: '#b45309', icon: '🛣️'  },
  environment:    { bg: '#f0fdf4', text: '#16a34a', icon: '🌿' },
  utility:        { bg: '#fefce8', text: '#92400e', icon: '⚡' },
};

export default function ReportIssue() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [filter, setFilter]   = useState('all');
  const [issues, setIssues]   = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', category: 'roads', body: '' });
  const [submitError, setSubmitError] = useState('');
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [bodyInvalid, setBodyInvalid] = useState(false);

  // Admin: inline status + note editing
  const [adminEdits, setAdminEdits] = useState({});

  useEffect(() => {
    apiGet('/api/issues')
      .then(d => {
        if (Array.isArray(d)) {
          // Map DB fields to display format
          setIssues(d.map(i => ({
            ...i,
            title: i.title || i.issue,
            body: i.body || i.location || i.issue,
            date: i.date || (i.created_at ? new Date(i.created_at).toISOString().slice(0,10) : ''),
            ago: i.ago || '',
            upvotes: i.upvotes || 0,
            updates: i.updates || (i.note ? [i.note] : []),
            category: i.category || 'general',
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  // Dynamic counts from live data
  const STATUS_FILTERS = [
    { key: 'all',         label: 'All Issues',  count: issues.length },
    { key: 'Open',        label: 'Open',        count: issues.filter(i => i.status === 'Open').length },
    { key: 'In Progress', label: 'In Progress', count: issues.filter(i => i.status === 'In Progress').length },
    { key: 'Resolved',    label: 'Resolved',    count: issues.filter(i => i.status === 'Resolved').length },
  ];

  const handleSubmit = async () => {
    const titleEmpty = !form.title.trim();
    const bodyEmpty = !form.body.trim();
    if (titleEmpty || bodyEmpty) {
      setTitleInvalid(titleEmpty);
      setBodyInvalid(bodyEmpty);
      setSubmitError('Title and details are required.');
      return;
    }
    setTitleInvalid(false);
    setBodyInvalid(false);
    setSubmitError('');
    try {
      const data = await apiPost('/api/issues', {
        name: user.name,
        issue: form.title.trim(),
        location: form.body.trim(),
        category: form.category,
      });
      const newIssue = {
        ...data,
        title: data.issue,
        body: data.location || data.body || data.issue,
        date: new Date().toISOString().slice(0,10),
        ago: 'Just now',
        upvotes: 0,
        updates: [],
      };
      setIssues(prev => [newIssue, ...prev]);
    } catch (err) {
      setSubmitError(err.message);
      const newIssue = { id: Date.now(), ...form, title: form.title, body: form.body, status: 'Open', date: new Date().toISOString().slice(0,10), upvotes: 0, ago: 'Just now', updates: [] };
      setIssues(prev => [newIssue, ...prev]);
    }
    setShowForm(false);
    setForm({ title: '', category: 'roads', body: '' });
  };

  const deleteIssue = async id => {
    try {
      await apiDelete(`/api/issues/${id}`);
      setIssues(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'Failed to delete issue.');
    }
  };

  const saveAdminUpdate = async id => {
    const edit = adminEdits[id] ?? {};
    try {
      const data = await apiPost(`/api/issues/${id}/update`, {
        status: edit.status,
        update: edit.note,
      });
      setIssues(prev => prev.map(i => {
        if (i.id !== id) return i;
        const newUpdates = edit.note?.trim()
          ? [...(i.updates || []), `${edit.note} – ${new Date().toISOString().slice(0,10)}`]
          : (i.updates || []);
        return { ...i, status: data.status ?? i.status, updates: newUpdates, note: data.note };
      }));
    } catch {
      setIssues(prev => prev.map(i => {
        if (i.id !== id) return i;
        const updatedNotes = edit.note?.trim() ? [...(i.updates||[]), `${edit.note} – ${new Date().toISOString().slice(0,10)}`] : (i.updates||[]);
        return { ...i, status: edit.status ?? i.status, updates: updatedNotes };
      }));
    }
    setAdminEdits(prev => ({ ...prev, [id]: {} }));
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ri-wrap">
        <div className="ri-page-header">
          <div>
            <p className="ri-sub">Report problems and track fixes across the city</p>
          </div>
          {!isAdmin && (
            <button className="ri-report-btn" onClick={() => {
              setShowForm(true);
              setTitleInvalid(false);
              setBodyInvalid(false);
              setSubmitError('');
            }}>+ Report Issue</button>
          )}
        </div>

        <div className="ri-chips">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} className={`ri-chip${filter === f.key ? ' ri-chip-active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label} <span className="ri-chip-count">({f.count})</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>📋</div>
            <p style={{ margin:0, fontSize:'1.05rem' }}>No issues found.</p>
          </div>
        )}

        <div className="ri-list">
          {filtered.map((issue, i) => {
            const cat = CAT_STYLES[issue.category] ?? { bg: '#f3f4f6', text: '#374151', icon: '📌' };
            const st  = STATUS_STYLES[issue.status] ?? { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
            const edit = adminEdits[issue.id] ?? {};
            return (
              <div className="ri-card" key={issue.id} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="ri-card-top">
                  <div className="ri-badges">
                    <span className="ri-badge" style={{ background: cat.bg, color: cat.text }}>{cat.icon} {issue.category}</span>
                    <span className="ri-status" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{issue.status}</span>
                  </div>
                  <span className="ri-date">{issue.date}</span>
                </div>

                <h3 className="ri-card-title">{issue.title}</h3>
                <p className="ri-card-body">{issue.body}</p>

                {issue.updates.length > 0 && (
                  <div className="ri-updates">
                    <div className="ri-updates-label">ADMIN UPDATES</div>
                    {issue.updates.map((u, j) => <p key={j} className="ri-update-item">• {u}</p>)}
                  </div>
                )}

                {/* Admin controls */}
                {isAdmin && (
                  <div className="ri-admin-section">
                    <div className="ri-admin-row">
                      <div className="ri-admin-field">
                        <label className="ri-admin-label">Update Status</label>
                        <select
                          className="ri-admin-select"
                          value={edit.status ?? issue.status}
                          onChange={e => setAdminEdits(p => ({ ...p, [issue.id]: { ...p[issue.id], status: e.target.value } }))}
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </div>
                      <div className="ri-admin-field ri-admin-field-grow">
                        <label className="ri-admin-label">Add Note</label>
                        <input
                          className="ri-admin-input"
                          placeholder="e.g. Assigned to maintenance team"
                          value={edit.note ?? ''}
                          onChange={e => setAdminEdits(p => ({ ...p, [issue.id]: { ...p[issue.id], note: e.target.value } }))}
                        />
                      </div>
                      <button className="ri-save-btn" onClick={() => saveAdminUpdate(issue.id)}>Save</button>
                      {issue.status === 'Resolved' && (
                        <button className="ri-delete-btn" onClick={() => deleteIssue(issue.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                )}

                <div className="ri-card-footer">
                  <span className="ri-ago">{issue.ago}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit form modal — citizens and merchants */}
        {showForm && (
          <div className="ri-modal-bg" onClick={() => setShowForm(false)}>
            <div className="ri-modal" onClick={e => e.stopPropagation()}>
              <div className="ri-modal-header">
                <h2>Report a New Issue</h2>
                <button className="ri-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="ri-form">
                <label>Title</label>
                <input
                  value={form.title}
                  onChange={e => {
                    setForm(f => ({ ...f, title: e.target.value }));
                    if (titleInvalid && e.target.value.trim()) setTitleInvalid(false);
                  }}
                  placeholder="Brief description of the issue"
                  className={titleInvalid ? 'ri-input-invalid' : ''}
                />
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="roads">Roads</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="environment">Environment</option>
                  <option value="utility">Utility</option>
                </select>
                <label>Details</label>
                <textarea
                  rows={4}
                  value={form.body}
                  onChange={e => {
                    setForm(f => ({ ...f, body: e.target.value }));
                    if (bodyInvalid && e.target.value.trim()) setBodyInvalid(false);
                  }}
                  placeholder="Describe the issue and its location…"
                  className={bodyInvalid ? 'ri-input-invalid' : ''}
                />
                {submitError && <p className="ri-form-error">{submitError}</p>}
                <div className="ri-form-actions">
                  <button className="ri-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="ri-submit" onClick={handleSubmit}>Submit Report</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
  .ri-wrap { padding:8px 0 48px; }
  .ri-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; }
  .ri-title { font-size: 1.95rem; font-weight:700; color:#0f172a; margin:0 0 6px; letter-spacing:-0.3px; }
  .ri-sub   { font-size: 1.05rem; color:#64748b; margin:0; }
  .ri-report-btn { background:#1e40af; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size: 1.05rem; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .15s; }
  .ri-report-btn:hover { background:#1d4ed8; }

  .ri-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .ri-chip { padding:7px 14px; font-size: 0.975rem; font-weight:500; background:#fff; color:#475569; border:1.5px solid #e2e8f0; border-radius:20px; cursor:pointer; transition:all .15s; }
  .ri-chip:hover { border-color:#93c5fd; color:#1e40af; }
  .ri-chip-active { background:#1e3a5f !important; color:#fff !important; border-color:transparent !important; }
  .ri-chip-count  { font-weight:400; opacity:.8; }

  .ri-list { display:flex; flex-direction:column; gap:14px; }
  @keyframes ri-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

  .ri-card { background:#fff; border:1.5px solid #e8edf3; border-radius:12px; padding:20px 24px; animation:ri-in .3s ease both; transition:box-shadow .18s; }
  .ri-card:hover { box-shadow:0 4px 18px rgba(15,23,42,.07); }
  .ri-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .ri-badges { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .ri-badge  { font-size: 0.8626rem; font-weight:600; padding:3px 10px; border-radius:6px; }
  .ri-status { font-size: 0.8626rem; font-weight:600; padding:3px 10px; border-radius:6px; }
  .ri-date   { font-size: 0.9376rem; color:#94a3b8; }
  .ri-card-title { font-size: 1.2rem; font-weight:700; color:#1e293b; margin:0 0 8px; }
  .ri-card-body  { font-size: 1.0126rem; color:#64748b; margin:0 0 14px; line-height:1.6; }

  .ri-updates { background:#f0f7ff; border-radius:8px; padding:12px 16px; margin-bottom:14px; }
  .ri-updates-label { font-size: 0.75rem; font-weight:700; letter-spacing:.08em; color:#3b82f6; margin-bottom:8px; }
  .ri-update-item { font-size: 0.975rem; color:#334155; margin:4px 0; }

  /* Admin inline controls */
  .ri-admin-section { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-bottom:14px; }
  .ri-admin-row { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
  .ri-admin-field { display:flex; flex-direction:column; gap:5px; }
  .ri-admin-field-grow { flex:1; min-width:180px; }
  .ri-admin-label { font-size: 0.825rem; font-weight:700; letter-spacing:.06em; color:#64748b; text-transform:uppercase; }
  .ri-admin-select, .ri-admin-input {
    padding:8px 12px; font-size: 1.0126rem; font-family:inherit;
    border:1.5px solid #e2e8f0; border-radius:8px; outline:none;
    background:#fff; transition:border-color .15s;
  }
  .ri-admin-select:focus, .ri-admin-input:focus { border-color:#3b82f6; }
  .ri-save-btn, .ri-delete-btn { border:none; border-radius:8px; padding:9px 18px; font-size: 0.975rem; font-weight:600; cursor:pointer; transition:background .15s; white-space:nowrap; }
  .ri-save-btn { background:#1e40af; color:#fff; }
  .ri-save-btn:hover { background:#1d4ed8; }
  .ri-delete-btn { background:#dc2626; color:#fff; }
  .ri-delete-btn:hover { background:#b91c1c; }

  .ri-card-footer { display:flex; align-items:center; justify-content:flex-end; padding-top:4px; }
  .ri-ago { font-size: 0.9376rem; color:#94a3b8; }

  .ri-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .ri-modal { background:#fff; border-radius:16px; padding:28px; width:480px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .ri-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .ri-modal-header h2 { font-size: 1.35rem; font-weight:700; color:#0f172a; margin:0; }
  .ri-modal-close { background:none; border:none; font-size: 1.35rem; cursor:pointer; color:#94a3b8; }
  .ri-form { display:flex; flex-direction:column; gap:12px; }
  .ri-form label { font-size: 0.975rem; font-weight:600; color:#374151; }
  .ri-form input, .ri-form select, .ri-form textarea { width:100%; box-sizing:border-box; padding:10px 14px; font-size: 1.05rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }
  .ri-form input:focus, .ri-form select:focus, .ri-form textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
  .ri-input-invalid { border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.12) !important; }
  .ri-form-error { margin: 0; color:#dc2626; font-size:.95rem; }
  .ri-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .ri-cancel { padding:9px 18px; font-size: 1.05rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .ri-submit { padding:9px 18px; font-size: 1.05rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .ri-submit:hover { background:#1d4ed8; }
`;
