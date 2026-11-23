import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { api, apiGet, apiPost, apiDelete } from '../api';

const FILTERS = [
  { key: 'all',       label: 'All',       icon: '🔔' },
  { key: 'event',     label: 'Event',     icon: '📅' },
  { key: 'traffic',   label: 'Traffic',   icon: '🚦' },
  { key: 'utility',   label: 'Utility',   icon: '💧' },
  { key: 'transport', label: 'Transport', icon: '🚌' },
];

const CATEGORY_STYLES = {
  traffic:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  event:     { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  utility:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  transport: { bg: '#f0fdf4', text: '#059669', border: '#a7f3d0' },
};

const ACCENT_BORDER = {
  traffic:   '#ef4444',
  event:     '#3b82f6',
  utility:   '#f59e0b',
  transport: '#10b981',
};

export default function Announcements() {
  const { user } = useAuth();
  const [active, setActive] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', expiresInHours: '', category: 'event' });
  const [formError, setFormError] = useState('');
  const [messageInvalid, setMessageInvalid] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    apiGet('/api/announcements')
      .then(d => { if (Array.isArray(d)) setAnnouncements(d); })
      .catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title?.trim() || !form.message?.trim()) {
      setMessageInvalid(!form.message?.trim());
      setFormError('Title and description are required.');
      return;
    }

    setMessageInvalid(false);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        category: form.category || 'event',
        expiresInHours: form.expiresInHours ? Number(form.expiresInHours) : undefined,
      };

      const data = editingId
        ? await api(`/api/announcements/${editingId}`, {
            method: 'PUT',
            body: payload,
          })
        : await apiPost('/api/announcements', payload);

      setAnnouncements(prev => {
        if (editingId) {
          return prev.map(item => item.id === editingId ? data : item);
        }
        return [data, ...prev];
      });

      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', message: '', expiresInHours: '', category: 'event' });
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Open confirmation modal (set id) when initiating delete
  const handleDelete = async (id) => {
    setDeleteConfirm(id);
  };

  // Called when user confirms deletion in the modal
  const confirmDelete = async () => {
    const id = deleteConfirm;
    if (!id) return;
    try {
      await apiDelete(`/api/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      message: item.body || item.message || '',
      category: item.category || 'event',
      expiresInHours: '',
    });
    setShowForm(true);
  };

  // Map DB rows (title+message) to display format
  const mapped = announcements.map(a => ({
    ...a,
    body: a.body || a.message || '',
    category: a.category || 'event',
    icon: a.icon || '📢',
    date: a.date || (a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : ''),
  }));

  const filtered = useMemo(() =>
    active === 'all' ? mapped : mapped.filter(a => a.category === active),
    [active, mapped]
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="an-wrap">
        <div className="an-header">
          <p className="an-sub">Stay informed with the latest city-wide news and alerts</p>
          {user?.role === 'admin' && (
            <button
              className="an-post-btn"
              onClick={() => {
                setEditingId(null);
                setForm({ title: '', message: '', expiresInHours: '', category: 'event' });
                setMessageInvalid(false);
                setShowForm(true);
              }}
            >
              + Post Announcement
            </button>
          )}
        </div>

        <div className="an-chips">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`an-chip${active === f.key ? ' an-chip-active' : ''}`}
              onClick={() => setActive(f.key)}
            >
              <span>{f.icon}</span>{f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:'12px' }}>📢</div>
            <p style={{ margin:0, fontSize:'1.05rem' }}>No announcements yet.</p>
          </div>
        )}

        <div className="an-list">
          {filtered.map((item, i) => {
            const cat = CATEGORY_STYLES[item.category] ?? { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
            const accent = ACCENT_BORDER[item.category] ?? '#94a3b8';
            return (
              <div
                key={item.id}
                className="an-card"
                style={{ '--accent': accent, animationDelay: `${i * 50}ms` }}
              >
                <div className="an-card-top">
                  <div className="an-badges">
                    <span className="an-badge" style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                      {item.icon} {item.category}
                    </span>
                    {item.priority && (
                      <span className="an-priority">⚠️ {item.priority}</span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span className="an-date">{item.date}</span>
                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="an-edit-btn" onClick={() => openEdit(item)} title="Edit">✎</button>
                        <button className="an-del-btn" onClick={() => handleDelete(item.id)} title="Delete">✕</button>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="an-card-title">{item.title}</h3>
                <p className="an-card-body">{item.body}</p>
              </div>
            );
          })}
        </div>

        {/* Admin: Create Announcement Modal */}
        {showForm && (
          <div className="an-modal-bg" onClick={() => setShowForm(false)}>
            <div className="an-modal" onClick={e => e.stopPropagation()}>
              <div className="an-modal-header">
                <h2>{editingId ? 'Edit Announcement' : 'Post Announcement'}</h2>
                <button className="an-modal-close" onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}>✕</button>
              </div>
              <form className="an-form" onSubmit={handleCreate}>
                <label>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" required />
                <label>Type</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="event">Event</option>
                  <option value="traffic">Traffic</option>
                  <option value="utility">Utility</option>
                  <option value="transport">Transport</option>
                </select>
                <label>Message</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={e => {
                    setForm(f => ({ ...f, message: e.target.value }));
                    if (messageInvalid && e.target.value.trim()) setMessageInvalid(false);
                  }}
                  placeholder="Full announcement message…"
                  required
                  className={`an-textarea${messageInvalid ? ' an-invalid' : ''}`}
                />
                <label>Expires in (hours) <span style={{fontWeight:400,color:'#94a3b8'}}>(optional)</span></label>
                <input type="number" min="1" value={form.expiresInHours} onChange={e => setForm(f => ({ ...f, expiresInHours: e.target.value }))} placeholder="Leave blank for no expiry" />
                {formError && <p className="an-form-error">{formError}</p>}
                <div className="an-form-actions">
                  <button type="button" className="an-cancel" onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >Cancel</button>
                  <button type="submit" className="an-submit">
                    {editingId ? 'Save Changes' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm !== null && (
          <div className="an-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="an-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>Delete announcement?</h3>
              <p>Are you sure you want to permanently delete this announcement?</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="an-edit-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="an-del-btn" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
  .an-wrap { padding: 8px 0 48px; }

  .an-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 24px; flex-wrap:wrap; gap:12px; }
  .an-title  { font-size: 1.95rem; font-weight: 700; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.3px; }
  .an-sub    { font-size: 1.05rem; color: #64748b; margin: 0; }
  .an-post-btn { background:#1e40af; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size:1.05rem; font-weight:600; cursor:pointer; white-space:nowrap; transition:background .15s; }
  .an-post-btn:hover { background:#1d4ed8; }
  .an-edit-btn,
  .an-del-btn {
    background:none; border:none; color:#94a3b8; font-size:0.95rem; cursor:pointer;
    padding:4px 8px; border-radius:6px; transition:color .15s,background .15s;
  }
  .an-edit-btn:hover,
  .an-del-btn:hover { color:#1e40af; background:#e0f2fe; }
  .an-del-btn:hover { color:#dc2626; background:#fee2e2; }

  .an-chips  { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .an-chip {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 16px; font-size: 0.975rem; font-weight: 500;
    background: #fff; color: #475569;
    border: 1.5px solid #e2e8f0; border-radius: 20px;
    cursor: pointer; transition: all .15s;
  }
  .an-chip:hover { border-color: #93c5fd; color: #1e40af; background: #f0f7ff; }
  .an-chip-active { background: #1e3a5f !important; color: #fff !important; border-color: transparent !important; }

  .an-textarea { width: 100%; min-height: 132px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; background: #fff; color: #0f172a; font-size: 0.975rem; resize: vertical; transition: border-color .15s, box-shadow .15s; }
  .an-textarea:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
  .an-textarea.an-invalid { border-color:#dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,.12); }

  .an-list { display: flex; flex-direction: column; gap: 14px; }

  .an-confirm-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
    display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px;
  }
  .an-confirm-modal {
    background: #fff; border-radius: 14px; padding: 18px 20px; width: 100%; max-width: 420px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  }
  .an-confirm-modal .an-del-btn { background:#dc2626; color:#fff; border-radius:8px; padding:8px 14px; border:none; }
  .an-confirm-modal .an-del-btn:hover { background:#b91c1c; }
  .an-confirm-modal .an-edit-btn { background:#1e40af; color:#fff; border-radius:8px; padding:8px 14px; border:none; }
  .an-confirm-modal .an-edit-btn:hover { background:#1d4ed8; }

  @keyframes an-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

  .an-card {
    background: #fff;
    border: 1.5px solid #e8edf3;
    border-left: 4px solid var(--accent);
    border-radius: 12px;
    padding: 20px 24px;
    animation: an-in .3s ease both;
    transition: box-shadow .18s;
  }
  .an-card:hover { box-shadow: 0 4px 18px rgba(15,23,42,.07); }

  .an-card-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
  }
  .an-badges { display: flex; align-items: center; gap: 8px; }
  .an-badge  {
    font-size: 0.8626rem; font-weight: 600;
    padding: 3px 10px; border-radius: 6px;
  }
  .an-priority {
    font-size: 0.8626rem; font-weight: 600;
    background: #fff7ed; color: #c2410c;
    border: 1px solid #fed7aa;
    padding: 3px 10px; border-radius: 6px;
  }
  .an-date { font-size: 0.9376rem; color: #94a3b8; }

  .an-card-title { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
  .an-card-body  { font-size: 1.0126rem; color: #64748b; margin: 0; line-height: 1.6; }

  .an-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .an-modal { background:#fff; border-radius:16px; padding:28px; width:480px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .an-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .an-modal-header h2 { font-size:1.35rem; font-weight:700; color:#0f172a; margin:0; }
  .an-modal-close { background:none; border:none; font-size:1.35rem; cursor:pointer; color:#94a3b8; }
  .an-form { display:flex; flex-direction:column; gap:10px; }
  .an-form label { font-size:.975rem; font-weight:600; color:#374151; }
  .an-form input { width:100%; box-sizing:border-box; padding:10px 14px; font-size:1.05rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; font-family:inherit; transition:border-color .15s; }
  .an-form input:focus { border-color:#3b82f6; }
  .an-textarea { width:100%; box-sizing:border-box; padding:9px 12px; font-size:1.0126rem; font-family:inherit; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; resize:vertical; transition:border-color .15s; }
  .an-textarea:focus { border-color:#3b82f6; }
  .an-form-error { font-size:.9rem; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; margin:0; }
  .an-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .an-cancel { padding:9px 18px; font-size:1.05rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .an-submit { padding:9px 18px; font-size:1.05rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .an-submit:hover { background:#1d4ed8; }
`;
