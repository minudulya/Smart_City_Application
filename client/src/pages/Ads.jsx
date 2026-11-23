import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiGet, apiPost, apiDelete } from '../api';

const AD_CATEGORIES = ['All Ads','Retail','Food','Health','Services','Education'];
const CAT_ICONS = { retail:'🛒', food:'🍔', health:'🩺', services:'🔧', education:'🎓' };
const CAT_COLORS = {
  retail:    { bg: '#eff6ff', accent: '#2563eb' },
  food:      { bg: '#f0fdf4', accent: '#16a34a' },
  health:    { bg: '#fdf4ff', accent: '#9333ea' },
  services:  { bg: '#fff7ed', accent: '#ea580c' },
  education: { bg: '#fefce8', accent: '#ca8a04' },
};
const EMOJI_BG = { retail:'#dbeafe', food:'#dcfce7', health:'#f3e8ff', services:'#ffedd5', education:'#fef9c3' };

export default function Ads() {
  const { user } = useAuth();
  const [ads, setAds]           = useState([]);
  const [catFilter, setCatFilter] = useState('All Ads');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', category: 'retail', description: '', phone: '', image: '' });
  const [message, setMessage]   = useState('');

  useEffect(() => {
    if (!user) return;
    apiGet('/api/ads').then(d => { if (Array.isArray(d)) setAds(d); }).catch(() => {});
  }, [user]);

  // What each role sees
  const visibleAds = (() => {
    if (user?.role === 'citizen' || user?.role === 'merchant') return ads.filter(a => a.status === 'Published');
    return ads; // admin sees all
  })();

  const catFiltered = catFilter === 'All Ads' ? visibleAds : visibleAds.filter(a => a.category === catFilter.toLowerCase());


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
    setMessage('Ad submitted for approval.'); setShowForm(false); setForm({ title: '', category: 'retail', description: '', phone: '', image: '' });
  };

  const publishAd = async id => {
    try {
      const updated = await apiPost(`/api/ads/${id}/publish`);
      setAds(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch { setAds(prev => prev.map(a => a.id === id ? { ...a, status: 'Published' } : a)); }
  };
  const unpublishAd = async id => {
    try {
      const updated = await apiPost(`/api/ads/${id}/unpublish`);
      setAds(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch { setAds(prev => prev.map(a => a.id === id ? { ...a, status: 'Pending' } : a)); }
  };
  const removeAd = async id => {
    try { await apiDelete(`/api/ads/${id}`); } catch {}
    setAds(prev => prev.filter(a => a.id !== id));
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ads-wrap">

        {/* Header */}
        <div className="ads-page-header">
          <div>
            <p className="ads-sub">
              {user?.role === 'admin' ? 'Review and manage all city advertisements' : 'Local business promotions and community offers'}
            </p>
          </div>

        </div>

        {/* Category chips */}
        {(
          <div className="ads-chips">
            {AD_CATEGORIES.map(c => (
              <button key={c} className={`ads-chip${catFilter === c ? ' ads-chip-active' : ''}`} onClick={() => setCatFilter(c)}>
                {c !== 'All Ads' && <span>{CAT_ICONS[c.toLowerCase()]}</span>} {c}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {catFiltered.length === 0 ? (
          <div className="ads-empty"><div className="ads-empty-icon">📣</div><p>No advertisements found.</p></div>
        ) : (
          <div className="ads-grid">
            {catFiltered.map((ad, i) => {
              const cat   = ad.category?.toLowerCase() ?? 'services';
              const cols  = CAT_COLORS[cat] ?? { bg: '#f8fafc', accent: '#475569' };
              const ebg   = EMOJI_BG[cat] ?? '#f1f5f9';
              const isLive = ad.status === 'Published';
              return (
                <div className="ads-card" key={ad.id} style={{ animationDelay: `${i * 50}ms` }}>
                  {/* Image area */}
                  <div className="ads-card-img" style={ad.image ? { backgroundImage: `url(${ad.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: cols.bg }}>
                    {!ad.image && (
                      <div className="ads-card-emoji" style={{ background: ebg }}>
                        {CAT_ICONS[cat] ?? '📦'}
                      </div>
                    )}
                    <span className={`ads-live-badge${isLive ? ' ads-live' : ' ads-pending-badge'}`}>
                      {isLive ? '✓ Live' : '⏳ Pending'}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="ads-card-body">
                    <h3 className="ads-card-title">{ad.title}</h3>
                    <p className="ads-card-author" style={{ color: cols.accent }}>by {ad.author}</p>
                    <span className="ads-cat-tag">{cat}</span>
                    <p className="ads-card-desc">{ad.description}</p>
                    {ad.phone && <p className="ads-card-phone">📞 {ad.phone}</p>}

                    {/* Admin controls */}
                    {user?.role === 'admin' && (
                      <div className="ads-admin-btns">
                        {!isLive
                          ? <button className="ads-btn ads-btn-publish" onClick={() => publishAd(ad.id)}>Publish</button>
                          : <button className="ads-btn ads-btn-unpublish" onClick={() => unpublishAd(ad.id)}>Unpublish</button>
                        }
                        <button className="ads-btn ads-btn-delete" onClick={() => removeAd(ad.id)}>Delete</button>
                      </div>
                    )}


                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message && <p className="ads-message">{message}</p>}

        {/* Post Ad modal (merchant) */}
        {showForm && (
          <div className="ads-modal-bg" onClick={() => setShowForm(false)}>
            <div className="ads-modal" onClick={e => e.stopPropagation()}>
              <div className="ads-modal-header">
                <h2>Post New Ad</h2>
                <button className="ads-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="ads-form">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Grand Opening – My Shop" />
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['retail','food','health','services','education'].map(c => <option key={c}>{c}</option>)}
                </select>
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your offer…" className="ads-textarea" />
                <label>Phone Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 011-234-5678" />
                
                <label>Business Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="ads-file-input" />
                {form.image && (
                  <div className="ads-img-preview">
                    <img src={form.image} alt="Preview" />
                    <button type="button" className="ads-clear-img" onClick={() => setForm(f => ({ ...f, image: '' }))}>Remove Image</button>
                  </div>
                )}

                <div className="ads-form-actions">
                  <button className="ads-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="ads-submit" onClick={handleSubmit}>Submit for Approval</button>
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
  .ads-wrap { padding:8px 0 48px; }
  .ads-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:16px; }
  .ads-title { font-size: 1.95rem; font-weight:700; color:#0f172a; margin:0 0 6px; letter-spacing:-0.3px; }
  .ads-sub   { font-size: 1.05rem; color:#64748b; margin:0; }
  .ads-new-btn { background:#1e40af; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-size: 1.05rem; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0; transition:background .15s; }
  .ads-new-btn:hover { background:#1d4ed8; }

  .ads-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .ads-chip { display:flex; align-items:center; gap:5px; padding:7px 14px; font-size: 0.975rem; font-weight:500; background:#fff; color:#475569; border:1.5px solid #e2e8f0; border-radius:20px; cursor:pointer; transition:all .15s; }
  .ads-chip:hover { border-color:#93c5fd; color:#1e40af; }
  .ads-chip-active { background:#1e3a5f !important; color:#fff !important; border-color:transparent !important; }

  .ads-empty { text-align:center; padding:80px 24px; color:#94a3b8; font-size: 1.05rem; }
  .ads-empty-icon { font-size: 3.9rem; margin-bottom:12px; }

  .ads-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
  .ads-grid-merchant { grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); }
  @media(max-width:1100px){ .ads-grid{ grid-template-columns:repeat(2,1fr); } }
  @media(max-width:640px) { .ads-grid{ grid-template-columns:1fr; } }

  @keyframes ads-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .ads-card { background:#fff; border:1.5px solid #e8edf3; border-radius:16px; overflow:hidden; animation:ads-in .35s ease both; transition:box-shadow .18s, transform .18s; }
  .ads-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.09); transform:translateY(-2px); }

  .ads-card-img { position:relative; height:120px; display:flex; align-items:center; justify-content:center; }
  .ads-card-emoji { width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size: 2.25rem; }
  .ads-live-badge { position:absolute; top:12px; right:12px; font-size: 0.8626rem; font-weight:600; padding:3px 9px; border-radius:6px; }
  .ads-live         { background:#dcfce7; color:#15803d; }
  .ads-pending-badge{ background:#fff7ed; color:#b45309; }

  .ads-card-body { padding:16px 18px 18px; }
  .ads-card-title  { font-size: 1.125rem; font-weight:700; color:#1e293b; margin:0 0 4px; }
  .ads-card-author { font-size: 0.9376rem; font-weight:600; margin:0 0 8px; }
  .ads-cat-tag { display:inline-block; font-size: 0.825rem; font-weight:600; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:5px; margin-bottom:8px; }
  .ads-card-desc  { font-size: 0.975rem; color:#64748b; margin:0 0 10px; line-height:1.5; }
  .ads-card-phone { font-size: 0.975rem; color:#475569; margin:0; }

  .ads-admin-btns { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
  .ads-btn { font-size: 0.9376rem; font-weight:600; padding:6px 14px; border:none; border-radius:7px; cursor:pointer; transition:all .15s; }
  .ads-btn-publish   { background:#dcfce7; color:#15803d; }
  .ads-btn-publish:hover { background:#bbf7d0; }
  .ads-btn-unpublish { background:#fef9c3; color:#92400e; }
  .ads-btn-unpublish:hover { background:#fde68a; }
  .ads-btn-delete    { background:#fee2e2; color:#dc2626; }
  .ads-btn-delete:hover { background:#fecaca; }
  .ads-btn-remove    { margin-top:12px; background:#fee2e2; color:#dc2626; }
  .ads-btn-remove:hover { background:#fecaca; }

  .ads-message { font-size: 1.0126rem; color:#16a34a; margin-top:12px; }

  .ads-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; }
  .ads-modal { background:#fff; border-radius:16px; padding:28px; width:480px; max-width:95vw; box-shadow:0 24px 60px rgba(15,23,42,.2); }
  .ads-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .ads-modal-header h2 { font-size: 1.35rem; font-weight:700; color:#0f172a; margin:0; }
  .ads-modal-close { background:none; border:none; font-size: 1.35rem; cursor:pointer; color:#94a3b8; }
  .ads-form { display:flex; flex-direction:column; gap:10px; }
  .ads-form label { font-size: 0.975rem; font-weight:600; color:#374151; }
  .ads-form input, .ads-form select { width:100%; box-sizing:border-box; padding:10px 14px; font-size: 1.05rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; font-family:inherit; transition:border-color .15s; }
  .ads-form input:focus, .ads-form select:focus { border-color:#3b82f6; }
  .ads-textarea { width:100%; box-sizing:border-box; padding:9px 12px; font-size: 1.0126rem; font-family:inherit; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; resize:vertical; transition:border-color .15s; }
  .ads-textarea:focus { border-color:#3b82f6; }
  .ads-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
  .ads-cancel { padding:9px 18px; font-size: 1.05rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .ads-submit { padding:9px 18px; font-size: 1.05rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .ads-submit:hover { background:#1d4ed8; }
  .ads-file-input { margin-bottom: 5px; }
  .ads-img-preview { position: relative; display: flex; align-items: center; gap: 10px; margin-top: 5px; margin-bottom: 10px; }
  .ads-img-preview img { width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
  .ads-clear-img { background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
  .ads-clear-img:hover { background: #fecaca; }
`;
