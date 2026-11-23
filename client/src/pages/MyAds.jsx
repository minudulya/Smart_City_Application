import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiGet, apiPost, apiDelete } from '../api';

const CAT_ICONS  = { retail:'🛒', food:'🍔', health:'🩺', services:'🔧', education:'🎓' };
const CAT_COLORS = {
  retail:    { bg: '#eff6ff', accent: '#2563eb' },
  food:      { bg: '#f0fdf4', accent: '#16a34a' },
  health:    { bg: '#fdf4ff', accent: '#9333ea' },
  services:  { bg: '#fff7ed', accent: '#ea580c' },
  education: { bg: '#fefce8', accent: '#ca8a04' },
};
const EMOJI_BG = { retail:'#dbeafe', food:'#dcfce7', health:'#f3e8ff', services:'#ffedd5', education:'#fef9c3' };

export default function MyAds() {
  const { user } = useAuth();
  const [ads, setAds]       = useState([]);
  const [tab, setTab]       = useState('My Ads');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ title: '', category: 'services', description: '', phone: '', image: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    apiGet('/api/ads')
      .then(d => { if (Array.isArray(d)) setAds(d.filter(a => a.author === user.name)); })
      .catch(() => {});
  }, [user]);

  const myAds    = ads.filter(a => a.author === user?.name);
  const approved = myAds.filter(a => a.status === 'Published');
  const pending  = myAds.filter(a => a.status === 'Pending');
  const counts   = { 'My Ads': myAds.length, 'Approved': approved.length, 'Pending': pending.length };
  const visible  = tab === 'My Ads' ? myAds : tab === 'Approved' ? approved : pending;

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    try {
      const data = await apiPost('/api/ads', { ...form, author: user.name });
      setAds(prev => [...prev, data]);
    } catch {
      setAds(prev => [...prev, { id: Date.now(), ...form, author: user.name, status: 'Pending' }]);
    }
    setMessage('Ad submitted for approval.');
    setShowForm(false);
    setForm({ title: '', category: 'services', description: '', phone: '', image: '' });
  };

  const removeAd = async id => {
    try {
      await apiDelete(`/api/ads/${id}`);
      setAds(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setMessage(err.message || 'Failed to delete ad.');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ma-wrap">

        <div className="ma-page-header">
          <div>
            <p className="ma-sub">Manage your business promotions on the city portal</p>
          </div>
          <button className="ma-post-btn" onClick={() => setShowForm(true)}>+ Post Ad</button>
        </div>

        {/* Tabs */}
        <div className="ma-chips">
          {Object.entries(counts).map(([t, count]) => (
            <button key={t} className={`ma-chip${tab === t ? ' ma-chip-active' : ''}`} onClick={() => setTab(t)}>
              {t} ({count})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="ma-empty"><div className="ma-empty-icon">📣</div><p>No ads here yet.</p></div>
        ) : (
          <div className="ma-grid">
            {visible.map((ad, i) => {
              const cat    = ad.category?.toLowerCase() ?? 'services';
              const cols   = CAT_COLORS[cat] ?? { bg: '#f8fafc', accent: '#475569' };
              const ebg    = EMOJI_BG[cat] ?? '#f1f5f9';
              const isLive = ad.status === 'Published';
              return (
                <div className="ma-card" key={ad.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="ma-card-img" style={ad.image ? { backgroundImage: `url(${ad.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: cols.bg }}>
                    {!ad.image && <div className="ma-card-emoji" style={{ background: ebg }}>{CAT_ICONS[cat] ?? '📦'}</div>}
                    <span className={`ma-live-badge${isLive ? ' ma-live' : ' ma-pending-badge'}`}>
                      {isLive ? '✓ Live' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="ma-card-body">
                    <h3 className="ma-card-title">{ad.title}</h3>
                    <p className="ma-card-author" style={{ color: cols.accent }}>by {ad.author}</p>
                    <span className="ma-cat-tag">{cat}</span>
                    <p className="ma-card-desc">{ad.description}</p>
                    {ad.phone && <p className="ma-card-phone">📞 {ad.phone}</p>}
                    <button className="ma-remove-btn" onClick={() => removeAd(ad.id)}>🗑 Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message && <p className="ma-message">{message}</p>}

        {showForm && (
          <div className="ma-modal-bg" onClick={() => setShowForm(false)}>
            <div className="ma-modal" onClick={e => e.stopPropagation()}>
              <div className="ma-modal-header">
                <h2>Post New Ad</h2>
                <button className="ma-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="ma-form">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Grand Opening – My Shop" />
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['retail','food','health','services','education'].map(c => <option key={c}>{c}</option>)}
                </select>
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your offer…" className="ma-textarea" />
                <label>Phone Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 011-234-5678" />
                
                <label>Business Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="ma-file-input" />
                {form.image && (
                  <div className="ma-img-preview">
                    <img src={form.image} alt="Preview" />
                    <button type="button" className="ma-clear-img" onClick={() => setForm(f => ({ ...f, image: '' }))}>Remove Image</button>
                  </div>
                )}

                <div className="ma-form-actions">
                  <button className="ma-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="ma-submit" onClick={handleSubmit}>Submit for Approval</button>
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
  .ma-wrap { padding:8px 0 48px; }
  .ma-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; }
  .ma-title { font-size: 1.95rem; font-weight:700; color:#0f172a; margin:0 0 6px; letter-spacing:-0.3px; }
  .ma-sub   { font-size: 1.05rem; color:#64748b; margin:0; }
  .ma-post-btn { background:#1e40af; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size: 1.05rem; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .15s; }
  .ma-post-btn:hover { background:#1d4ed8; }

  .ma-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .ma-chip { padding:7px 14px; font-size: 0.975rem; font-weight:500; background:#fff; color:#475569; border:1.5px solid #e2e8f0; border-radius:20px; cursor:pointer; transition:all .15s; }
  .ma-chip:hover { border-color:#93c5fd; color:#1e40af; }
  .ma-chip-active { background:#1e3a5f !important; color:#fff !important; border-color:transparent !important; }

  .ma-empty { text-align:center; padding:80px 24px; color:#94a3b8; font-size: 1.05rem; }
  .ma-empty-icon { font-size: 3.9rem; margin-bottom:12px; }

  .ma-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px; }
  @media(max-width:640px){ .ma-grid{ grid-template-columns:1fr; } }

  @keyframes ma-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .ma-card { background:#fff; border:1.5px solid #e8edf3; border-radius:16px; overflow:hidden; animation:ma-in .35s ease both; transition:box-shadow .18s,transform .18s; }
  .ma-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.09); transform:translateY(-2px); }

  .ma-card-img { position:relative; height:120px; display:flex; align-items:center; justify-content:center; }
  .ma-card-emoji { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size: 2.25rem; }
  .ma-live-badge { position:absolute; top:12px; right:12px; font-size: 0.8626rem; font-weight:600; padding:3px 9px; border-radius:6px; }
  .ma-live          { background:#dcfce7; color:#15803d; }
  .ma-pending-badge { background:#fff7ed; color:#b45309; }

  .ma-card-body { padding:16px 18px 18px; }
  .ma-card-title  { font-size: 1.125rem; font-weight:700; color:#1e293b; margin:0 0 4px; }
  .ma-card-author { font-size: 0.9376rem; font-weight:600; margin:0 0 8px; }
  .ma-cat-tag { display:inline-block; font-size: 0.825rem; font-weight:600; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:5px; margin-bottom:8px; }
  .ma-card-desc  { font-size: 0.975rem; color:#64748b; margin:0 0 10px; line-height:1.5; }
  .ma-card-phone { font-size: 0.975rem; color:#475569; margin:0 0 12px; }
  .ma-remove-btn { font-size: 0.9376rem; font-weight:600; background:#fee2e2; color:#dc2626; border:none; border-radius:7px; padding:6px 14px; cursor:pointer; transition:background .15s; }
  .ma-remove-btn:hover { background:#fecaca; }

  .ma-message { font-size: 1.0126rem; color:#16a34a; margin-top:12px; }

  .ma-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .ma-modal { background:#fff; border-radius:16px; padding:28px; width:480px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .ma-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .ma-modal-header h2 { font-size: 1.35rem; font-weight:700; color:#0f172a; margin:0; }
  .ma-modal-close { background:none; border:none; font-size: 1.35rem; cursor:pointer; color:#94a3b8; }
  .ma-form { display:flex; flex-direction:column; gap:10px; }
  .ma-form label { font-size: 0.975rem; font-weight:600; color:#374151; }
  .ma-form input, .ma-form select { width:100%; box-sizing:border-box; padding:10px 14px; font-size: 1.05rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; font-family:inherit; transition:border-color .15s; }
  .ma-form input:focus, .ma-form select:focus { border-color:#3b82f6; }
  .ma-textarea { width:100%; box-sizing:border-box; padding:9px 12px; font-size: 1.0126rem; font-family:inherit; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; resize:vertical; transition:border-color .15s; }
  .ma-textarea:focus { border-color:#3b82f6; }
  .ma-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
  .ma-cancel { padding:9px 18px; font-size: 1.05rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .ma-submit { padding:9px 18px; font-size: 1.05rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .ma-submit:hover { background:#1d4ed8; }
  .ma-file-input { margin-bottom: 5px; }
  .ma-img-preview { position: relative; display: flex; align-items: center; gap: 10px; margin-top: 5px; margin-bottom: 10px; }
  .ma-img-preview img { width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
  .ma-clear-img { background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
  .ma-clear-img:hover { background: #fecaca; }
`;
