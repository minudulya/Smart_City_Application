import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, apiGet, apiPost, apiDelete } from '../api';

const REQUEST_TYPES = ['Reserve City Hall','Event Permit','Business Permit','Special Data Access'];
// Show only the primary filters: All Requests and Pending
const STATUS_FILTERS = ['All Requests','Pending'];
const STATUS_STYLES = {
  'Pending':      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'Under Review': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'Approved':     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'Rejected':     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};
export default function RequestData() {
  const { user } = useAuth();
  const [filter, setFilter]   = useState('All Requests');
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [form, setForm]         = useState({ name: user?.name ?? '', requestType: REQUEST_TYPES[0], details: '' });
  const [message, setMessage]   = useState('');
  const [formError, setFormError] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [requestTypeInvalid, setRequestTypeInvalid] = useState(false);
  const [detailsInvalid, setDetailsInvalid] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiGet('/api/requests').then(d => { if (Array.isArray(d)) setRequests(d); }).catch(() => {});
  }, [user]);

  const mine = user?.role === 'admin' ? requests : requests.filter(r => r.name === user?.name);
  const counts = {
    'All Requests': mine.length,
    'Pending':      mine.filter(r => r.status === 'Pending').length,
    'Under Review': mine.filter(r => r.status === 'Under Review').length,
    'Approved':     mine.filter(r => r.status === 'Approved').length,
    'Rejected':     mine.filter(r => r.status === 'Rejected').length,
  };
  const filtered = filter === 'All Requests' ? mine : mine.filter(r => r.status === filter);

  const getRequestType = (req) => req.requestType || req.request_type || '';

  const resetForm = () => {
    setEditingRequest(null);
    setForm({ name: user?.name ?? '', requestType: REQUEST_TYPES[0], details: '' });
    setFormError('');
    setNameInvalid(false);
    setRequestTypeInvalid(false);
    setDetailsInvalid(false);
  };

  const handleSubmit = async () => {
    const nameEmpty = !form.name.trim();
    const requestTypeEmpty = !form.requestType?.trim();
    const detailsEmpty = !form.details.trim();
    if (nameEmpty || requestTypeEmpty || detailsEmpty) {
      setNameInvalid(nameEmpty);
      setRequestTypeInvalid(requestTypeEmpty);
      setDetailsInvalid(detailsEmpty);
      setFormError('Please complete all required fields.');
      return;
    }
    setFormError('');
    setNameInvalid(false);
    setRequestTypeInvalid(false);
    setDetailsInvalid(false);
    try {
      if (editingRequest) {
        const updated = await api(`/api/requests/${editingRequest.id}`, {
          method: 'PUT',
          body: { requestType: form.requestType, details: form.details },
        });
        setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
        setMessage('Request updated successfully.');
      } else {
        const data = await apiPost('/api/requests', { requestType: form.requestType, details: form.details });
        if (data) setRequests(prev => [...prev, data]);
        else setRequests(prev => [...prev, { id: Date.now(), name: user.name, ...form, status: 'Pending', ago: 'Just now', response: null }]);
        setMessage('Request submitted successfully.');
      }
    } catch {
      if (!editingRequest) {
        setRequests(prev => [...prev, { id: Date.now(), name: user.name, ...form, status: 'Pending', ago: 'Just now', response: null }]);
        setMessage('Request submitted successfully.');
      }
    }
    setShowForm(false);
    resetForm();
  };

  const startEdit = (req) => {
    setEditingRequest(req);
    setForm({ name: req.name, requestType: getRequestType(req), details: req.details });
    setFormError('');
    setNameInvalid(false);
    setRequestTypeInvalid(false);
    setDetailsInvalid(false);
    setShowForm(true);
  };

  const deleteRequest = async (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirm;
    if (!id) return;
    try {
      await apiDelete(`/api/requests/${id}`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setMessage(err.message || 'Failed to delete request.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const sendReply = async (id) => {
    const text = replyText[id]?.trim(); if (!text) return;
    try {
      const updated = await apiPost(`/api/requests/${id}/reply`, { response: text });
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, response: text, status: 'Responded' } : r));
    }
    setReplyText(prev => ({ ...prev, [id]: '' }));
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="rq-wrap">
        <div className="rq-page-header">
          <div>
            <p className="rq-sub">{user?.role === 'admin' ? 'Review and respond to citizen and merchant requests' : 'Reserve city spaces, request permits and special data'}</p>
          </div>
          {user?.role !== 'admin' && <button className="rq-new-btn" onClick={() => { resetForm(); setShowForm(true); }}>+ New Request</button>}
        </div>

        <div className="rq-chips">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`rq-chip${filter === f ? ' rq-chip-active' : ''}`} onClick={() => setFilter(f)}>
              {f} <span className="rq-chip-count">({counts[f]})</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rq-empty"><div className="rq-empty-icon">📋</div><p>You haven't submitted any requests yet.</p></div>
        ) : (
          <div className="rq-list">
            {filtered.map((req, i) => {
              const st = STATUS_STYLES[req.status] ?? { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
              const canEdit = req.user_id === user?.id || req.name === user?.name;
              const canDelete = user?.role === 'admin' || canEdit;
              return (
                <div className="rq-card" key={req.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="rq-card-top">
                    <div><h3 className="rq-card-title">{getRequestType(req)}</h3><p className="rq-card-meta">by {req.name} · {req.ago}</p></div>
                    <span className="rq-status" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{req.status}</span>
                  </div>
                  <p className="rq-card-body">{req.details}</p>
                  {req.response && <div className="rq-reply-box"><span className="rq-reply-label">Admin reply: </span>{req.response}</div>}
                  {(canEdit || canDelete) && (
                    <div className="rq-card-actions">
                      {canEdit && user?.role !== 'admin' && (
                        <button className="rq-edit-btn" onClick={() => startEdit(req)}>Edit</button>
                      )}
                      {canDelete && (
                        <button className="rq-delete-btn" onClick={() => deleteRequest(req.id)}>Delete</button>
                      )}
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div className="rq-admin-reply">
                      <textarea rows={2} placeholder="Write a reply…" value={replyText[req.id] ?? ''} onChange={e => setReplyText(p => ({ ...p, [req.id]: e.target.value }))} className="rq-textarea" />
                      <button className="rq-reply-btn" onClick={() => sendReply(req.id)}>Send Reply</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {message && <p className="rq-message">{message}</p>}

        {showForm && (
          <div className="rq-modal-bg" onClick={() => setShowForm(false)}>
            <div className="rq-modal" onClick={e => e.stopPropagation()}>
              <div className="rq-modal-header">
                <h2>New Request</h2>
                <button className="rq-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="rq-form">
                <label>Your Name</label>
                <input
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }));
                    if (nameInvalid && e.target.value.trim()) setNameInvalid(false);
                  }}
                  disabled={!!editingRequest}
                  className={nameInvalid ? 'rq-input-invalid' : ''}
                />
                <label>Request Type</label>
                <select
                  value={form.requestType}
                  onChange={e => {
                    setForm(f => ({ ...f, requestType: e.target.value }));
                    if (requestTypeInvalid && e.target.value.trim()) setRequestTypeInvalid(false);
                  }}
                  className={requestTypeInvalid ? 'rq-input-invalid' : ''}
                >
                  <option value="">Select request type</option>
                  {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <label>Details</label>
                <textarea
                  rows={4}
                  value={form.details}
                  onChange={e => {
                    setForm(f => ({ ...f, details: e.target.value }));
                    if (detailsInvalid && e.target.value.trim()) setDetailsInvalid(false);
                  }}
                  placeholder="Describe your request…"
                  className={`rq-textarea${detailsInvalid ? ' rq-input-invalid' : ''}`}
                />
                {formError && <p className="rq-form-error">{formError}</p>}
                <div className="rq-form-actions">
                  <button className="rq-cancel" onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}>Cancel</button>
                  <button className="rq-submit" onClick={handleSubmit}>{editingRequest ? 'Save Changes' : 'Submit Request'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {deleteConfirm !== null && (
          <div className="rq-modal-bg" onClick={() => setDeleteConfirm(null)}>
            <div className="rq-modal rq-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="rq-modal-header">
                <h2>Delete request?</h2>
                <button className="rq-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
              </div>
              <p style={{ color: '#334155', lineHeight: 1.6, marginBottom: '20px' }}>
                This action cannot be undone. Are you sure you want to permanently delete this request?
              </p>
              <div className="rq-form-actions">
                <button className="rq-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="rq-delete-btn" onClick={confirmDelete}>Delete Request</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
  .rq-wrap { padding: 8px 0 48px; }
  .rq-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; }
  .rq-title { font-size: 1.95rem; font-weight:700; color:#0f172a; margin:0 0 6px; letter-spacing:-0.3px; }
  .rq-sub   { font-size: 1.05rem; color:#64748b; margin:0; }
  .rq-new-btn { background:#1e40af; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size: 1.05rem; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .15s; }
  .rq-new-btn:hover { background:#1d4ed8; }
  .rq-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .rq-chip { padding:7px 14px; font-size: 0.975rem; font-weight:500; background:#fff; color:#475569; border:1.5px solid #e2e8f0; border-radius:20px; cursor:pointer; transition:all .15s; }
  .rq-chip:hover { border-color:#93c5fd; color:#1e40af; }
  .rq-chip-active { background:#1e3a5f !important; color:#fff !important; border-color:transparent !important; }
  .rq-chip-count { font-weight:400; opacity:.8; }
  .rq-empty { text-align:center; padding:80px 24px; color:#94a3b8; font-size: 1.05rem; }
  .rq-empty-icon { font-size: 3.9rem; margin-bottom:12px; }
  .rq-list { display:flex; flex-direction:column; gap:12px; }
  @keyframes rq-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .rq-card { background:#fff; border:1.5px solid #e8edf3; border-radius:12px; padding:18px 22px; animation:rq-in .3s ease both; transition:box-shadow .18s; }
  .rq-card:hover { box-shadow:0 4px 18px rgba(15,23,42,.07); }
  .rq-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .rq-card-title { font-size: 1.125rem; font-weight:700; color:#1e293b; margin:0 0 4px; }
  .rq-card-meta  { font-size: 0.9376rem; color:#94a3b8; margin:0; }
  .rq-card-body  { font-size: 1.0126rem; color:#64748b; margin:0 0 10px; line-height:1.6; }
  .rq-card-type  { font-size: 0.95rem; color: #334155; margin: 0 0 10px; }
  .rq-status { font-size: 0.8626rem; font-weight:600; padding:3px 10px; border-radius:6px; white-space:nowrap; flex-shrink:0; }
  .rq-reply-box { background:#f0f7ff; border-radius:8px; padding:10px 14px; font-size: 0.975rem; color:#334155; margin-bottom:10px; }
  .rq-reply-label { font-weight:600; color:#2563eb; }
  .rq-card-actions { display:flex; gap:10px; flex-wrap:wrap; margin:10px 0; }
  .rq-edit-btn, .rq-delete-btn { border:none; border-radius:8px; padding:8px 14px; font-size: 0.95rem; font-weight:600; cursor:pointer; transition:background .15s; }
  .rq-edit-btn { background:#2563eb; color:#fff; }
  .rq-edit-btn:hover { background:#1d4ed8; }
  .rq-delete-btn { background:#dc2626; color:#fff; }
  .rq-delete-btn:hover { background:#b91c1c; }
  .rq-admin-reply { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
  .rq-textarea { width:100%; box-sizing:border-box; padding:9px 12px; font-size: 1.0126rem; font-family:inherit; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; resize:vertical; transition:border-color .15s; }
  .rq-textarea:focus { border-color:#3b82f6; }
  .rq-reply-btn { align-self:flex-end; background:#1e40af; color:#fff; border:none; border-radius:8px; padding:7px 16px; font-size: 0.975rem; font-weight:600; cursor:pointer; transition:background .15s; }
  .rq-reply-btn:hover { background:#1d4ed8; }
  .rq-message { font-size: 1.0126rem; color:#16a34a; margin-top:12px; }
  .rq-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .rq-modal { background:#fff; border-radius:16px; padding:28px; width:480px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .rq-confirm-modal { max-width:420px; }
  .rq-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .rq-modal-header h2 { font-size: 1.35rem; font-weight:700; color:#0f172a; margin:0; }
  .rq-modal-close { background:none; border:none; font-size: 1.35rem; cursor:pointer; color:#94a3b8; }
  .rq-form { display:flex; flex-direction:column; gap:10px; }
  .rq-form label { font-size: 0.975rem; font-weight:600; color:#374151; }
  .rq-form input, .rq-form select { width:100%; box-sizing:border-box; padding:10px 14px; font-size: 1.05rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }
  .rq-form input:focus, .rq-form select:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
  .rq-input-invalid { border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.12) !important; }
  .rq-form-error { margin:0; color:#dc2626; font-size:.95rem; }
  .rq-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
  .rq-cancel { padding:9px 18px; font-size: 1.05rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .rq-submit { padding:9px 18px; font-size: 1.05rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .rq-submit:hover { background:#1d4ed8; }
`;
