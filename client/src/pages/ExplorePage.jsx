import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { apiGet, apiPost, apiDelete, api } from '../api';

const CATEGORIES = [
  { key: 'all',        label: 'All Places',   icon: '🗺️' },
  { key: 'bank',       label: 'Banks',        icon: '🏦', color: '#6366f1' },
  { key: 'station',    label: 'Stations',     icon: '🚉', color: '#0ea5e9' },
  { key: 'police',     label: 'Police',       icon: '🚔', color: '#f59e0b' },
  { key: 'gas',        label: 'Gas Stations', icon: '⛽', color: '#ef4444' },
  { key: 'hospital',   label: 'Hospitals',    icon: '🏥', color: '#10b981' },
  { key: 'government', label: 'Government',   icon: '🏛️', color: '#8b5cf6' },
];

const BADGE_COLORS = {
  bank:       { bg: '#eff6ff', text: '#2563eb' },
  station:    { bg: '#ecfdf5', text: '#059669' },
  police:     { bg: '#fef9c3', text: '#b45309' },
  gas:        { bg: '#fef2f2', text: '#dc2626' },
  hospital:   { bg: '#f0fdf4', text: '#16a34a' },
  government: { bg: '#f5f3ff', text: '#7c3aed' },
};

const BLANK_FORM = {
  name: '', category: 'bank', address: '',
  phone: '', icon: '📍', rating: '', website: '', hours: '', image: '',
};

function normalizeWebsiteUrl(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="ep-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`ep-toast ep-toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ rating }) {
  const r = Number(rating) || 0;
  const full  = Math.floor(r);
  const half  = r % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="ep-stars" aria-label={`${r} stars`}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}
      <span className="ep-rating-num">{r.toFixed(1)}</span>
    </span>
  );
}

// ── Info Modal ────────────────────────────────────────────────────────────────
function InfoModal({ place, onClose }) {
  if (!place) return null;
  const badge = BADGE_COLORS[place.category] ?? { bg: '#f3f4f6', text: '#374151' };
  const is24h = (place.hours || '').toLowerCase().includes('24');

  return (
    <div className="ep-modal-bg" onClick={onClose}>
      <div className="ep-modal" onClick={e => e.stopPropagation()}>
        <button className="ep-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {place.image && (
          <div className="ep-modal-img-wrap">
            <img src={place.image} alt={place.name} className="ep-modal-img" />
          </div>
        )}

        <div className="ep-modal-header">
          <div className="ep-modal-icon">{place.icon || '📍'}</div>
          <div className="ep-modal-title-block">
            <span className="ep-badge" style={{ background: badge.bg, color: badge.text }}>
              {place.category}
            </span>
            <h2 className="ep-modal-name">{place.name}</h2>
            <p className="ep-modal-address">📍 {place.address}</p>
          </div>
        </div>

        <div className="ep-modal-divider" />

        <div className="ep-modal-rows">
          {place.phone && (
            <div className="ep-modal-row">
              <span className="ep-modal-row-icon">📞</span>
              <div>
                <p className="ep-modal-label">Official Phone</p>
                <a href={`tel:${place.phone}`} className="ep-modal-value ep-phone-link">{place.phone}</a>
              </div>
            </div>
          )}

          {place.hours && (
            <div className="ep-modal-row">
              <span className="ep-modal-row-icon">🕐</span>
              <div>
                <p className="ep-modal-label">Opening Hours</p>
                {is24h
                  ? <p className="ep-modal-value"><span className="ep-badge-24h">Open 24 Hours</span></p>
                  : <p className="ep-modal-value">{place.hours}</p>
                }
              </div>
            </div>
          )}

          <div className="ep-modal-row">
            <span className="ep-modal-row-icon">⭐</span>
            <div>
              <p className="ep-modal-label">Rating</p>
              <Stars rating={place.rating} />
            </div>
          </div>

          {place.website && (() => {
            const websiteUrl = normalizeWebsiteUrl(place.website);
            return (
              <div className="ep-modal-row">
                <span className="ep-modal-row-icon">🌐</span>
                <div>
                  <p className="ep-modal-label">Website</p>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ep-modal-value ep-phone-link"
                  >
                    {place.website}
                  </a>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="ep-modal-divider" />
        <div className="ep-modal-actions">
          <button className="ep-btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Form Modal ─────────────────────────────────────────────────────
function PlaceFormModal({ initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial || BLANK_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.category || !form.address.trim()) {
      return setError('Name, category and address are required.');
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        rating: Number(form.rating) || 0,
        website: form.website.trim(),
      });
    } catch (err) {
      setError(err.message || 'Failed to save place.');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!initial;

  return (
    <div className="ep-modal-bg" onClick={onClose}>
      <div className="ep-modal ep-form-modal" onClick={e => e.stopPropagation()}>
        <div className="ep-modal-close-row">
          <h2 className="ep-form-title">{isEdit ? 'Edit Place' : 'Add New Place'}</h2>
          <button className="ep-modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="ep-form" onSubmit={handleSubmit}>
          <div className="ep-form-row">
            <div className="ep-form-group ep-form-grow">
              <label>Name *</label>
              <input value={form.name} onChange={set('name')} placeholder="Place name" required />
            </div>
            <div className="ep-form-group" style={{ width: '120px' }}>
              <label>Icon</label>
              <input value={form.icon} onChange={set('icon')} placeholder="📍" maxLength={4} />
            </div>
          </div>

          <div className="ep-form-row">
            <div className="ep-form-group ep-form-grow">
              <label>Category *</label>
              <select value={form.category} onChange={set('category')}>
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="ep-form-group" style={{ width: '110px' }}>
              <label>Rating (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={set('rating')} placeholder="0.0" />
            </div>
          </div>

          <div className="ep-form-group">
            <label>Address *</label>
            <input value={form.address} onChange={set('address')} placeholder="Full street address" required />
          </div>

          <div className="ep-form-row">
            <div className="ep-form-group ep-form-grow">
              <label>Phone</label>
              <input value={form.phone} onChange={set('phone')} placeholder="e.g. 011-2446790" />
            </div>
            <div className="ep-form-group ep-form-grow">
              <label>Website</label>
              <input value={form.website} onChange={set('website')} placeholder="e.g. www.example.lk" />
            </div>
          </div>

          <div className="ep-form-group">
            <label>Opening Hours</label>
            <input value={form.hours} onChange={set('hours')} placeholder="e.g. Mon–Fri 9am–3pm or 24/7" />
          </div>

          <div className="ep-form-group">
            <label>Place Image <span style={{fontWeight:400,color:'#94a3b8'}}>(optional, max 5 MB)</span></label>
            <label className="ep-img-upload-label">
              <input type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}} />
              <span className="ep-img-upload-btn">📷 Choose Image</span>
            </label>
            {form.image && (
              <div className="ep-img-preview-wrap">
                <img src={form.image} alt="Preview" className="ep-img-preview" />
                <button
                  type="button"
                  className="ep-img-remove"
                  onClick={() => setForm(f => ({ ...f, image: '' }))}
                >✕ Remove</button>
              </div>
            )}
          </div>

          {error && <p className="ep-form-error">{error}</p>}

          <div className="ep-form-actions">
            <button type="button" className="ep-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="ep-btn-save" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ place, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="ep-modal-bg" onClick={onClose}>
      <div className="ep-modal ep-del-modal" onClick={e => e.stopPropagation()}>
        <div className="ep-del-icon">🗑️</div>
        <h3 className="ep-del-title">Delete Place?</h3>
        <p className="ep-del-body">
          <strong>{place.name}</strong> will be permanently removed from the city directory.
        </p>
        <div className="ep-form-actions" style={{ marginTop: '20px' }}>
          <button className="ep-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="ep-btn-delete"
            disabled={busy}
            onClick={async () => { setBusy(true); await onConfirm(); }}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [places,   setPlaces]   = useState([]);
  const [search,   setSearch]   = useState('');
  const [active,   setActive]   = useState('all');
  const [loading,  setLoading]  = useState(true);

  const [infoPlace,   setInfoPlace]   = useState(null);
  const [editPlace,   setEditPlace]   = useState(null); // null | false (add) | place obj (edit)
  const [deletePlace, setDeletePlace] = useState(null);

  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiGet('/api/places')
      .then(d => { if (Array.isArray(d) && d.length) setPlaces(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  const handleSave = async formData => {
    if (editPlace && editPlace.id) {
      // Update
      const updated = await api(`/api/places/${editPlace.id}`, { method: 'PUT', body: formData });
      setPlaces(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast(`"${updated.name}" updated.`);
    } else {
      // Create
      const created = await apiPost('/api/places', formData);
      setPlaces(prev => [...prev, created]);
      toast(`"${created.name}" added.`);
    }
    setEditPlace(null);
  };

  const handleDelete = async () => {
    await apiDelete(`/api/places/${deletePlace.id}`);
    setPlaces(prev => prev.filter(p => p.id !== deletePlace.id));
    toast(`"${deletePlace.name}" deleted.`, 'error');
    setDeletePlace(null);
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return places.filter(p => {
      const matchCat  = active === 'all' || p.category === active;
      const matchText = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [places, search, active]);

  return (
    <>
      <style>{CSS}</style>
      <Toast toasts={toasts} />

      <div className="ep-wrap">
        {/* Header row */}
        <div className="ep-page-header">
          <p className="ep-page-sub">Find banks, stations, police, hospitals, gas stations and government offices</p>
          {isAdmin && (
            <button className="ep-add-btn" onClick={() => setEditPlace(false)}>+ Add Place</button>
          )}
        </div>

        {/* Category chips */}
        <div className="ep-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`ep-chip${active === cat.key ? ' ep-chip-active' : ''}`}
              onClick={() => setActive(cat.key)}
              style={active === cat.key && cat.color ? { '--chip-color': cat.color } : {}}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="ep-count">
          {loading
            ? 'Loading places…'
            : <>Showing <strong>{filtered.length}</strong> place{filtered.length !== 1 ? 's' : ''}</>
          }
        </p>

        {/* Grid */}
        {!loading && filtered.length === 0 ? (
          <div className="ep-empty">
            {isAdmin ? 'No places available yet. Add the first place to get started.' : 'No places available yet. Please check back later.'}
          </div>
        ) : (
          <div className="ep-grid">
            {filtered.map((place, i) => {
              const badge = BADGE_COLORS[place.category] ?? { bg: '#f3f4f6', text: '#374151' };
              const is24h = (place.hours || '').toLowerCase().includes('24');
              return (
                <div className="ep-card" key={place.id} style={{ animationDelay: `${i * 40}ms` }}>
                  {/* Image banner — shown only when a photo is attached */}
                  {place.image && (
                    <div className="ep-card-img-wrap">
                      <img src={place.image} alt={place.name} className="ep-card-img" />
                    </div>
                  )}

                  <div className="ep-card-top">
                    {!place.image && <div className="ep-card-icon">{place.icon || '📍'}</div>}
                    <div className="ep-card-top-right" style={place.image ? { width:'100%', flexDirection:'row', justifyContent:'space-between' } : {}}>
                      <span className="ep-badge" style={{ background: badge.bg, color: badge.text }}>
                        {place.icon || '📍'} {place.category}
                      </span>
                      {isAdmin && (
                        <div className="ep-admin-btns">
                          <button
                            className="ep-edit-btn"
                            title="Edit"
                            onClick={() => setEditPlace(place)}
                          >✏️</button>
                          <button
                            className="ep-del-btn"
                            title="Delete"
                            onClick={() => setDeletePlace(place)}
                          >🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="ep-card-name">{place.name}</h3>
                  <p className="ep-card-meta">
                    <span className="ep-meta-icon">📍</span>
                    {place.address}
                  </p>

                  <div className="ep-card-details">
                    {place.phone && (
                      <span className="ep-card-detail-item">
                        <span className="ep-meta-icon">📞</span>
                        {place.phone}
                      </span>
                    )}
                    {place.hours && (
                      <span className="ep-card-detail-item">
                        <span className="ep-meta-icon">🕐</span>
                        {is24h ? <span className="ep-inline-24h">24/7</span> : place.hours}
                      </span>
                    )}
                  </div>

                  <div className="ep-card-footer">
                    <Stars rating={place.rating} />
                    <button
                      className="ep-info-btn"
                      onClick={() => setInfoPlace(place)}
                      aria-label={`More info about ${place.name}`}
                    >
                      ℹ️ Info
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <InfoModal   place={infoPlace}   onClose={() => setInfoPlace(null)} />

      {editPlace !== null && (
        <PlaceFormModal
          initial={editPlace || null}
          onSave={handleSave}
          onClose={() => setEditPlace(null)}
        />
      )}

      {deletePlace && (
        <DeleteModal
          place={deletePlace}
          onConfirm={handleDelete}
          onClose={() => setDeletePlace(null)}
        />
      )}
    </>
  );
}

// ── Scoped styles ─────────────────────────────────────────────────────────────
const CSS = `
  .ep-wrap {
    padding: 8px 0 48px;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
  }

  /* Toast */
  .ep-toast-wrap { position:fixed; top:20px; right:20px; z-index:9000; display:flex; flex-direction:column; gap:8px; }
  .ep-toast {
    padding:12px 20px; border-radius:10px; font-size:.975rem; font-weight:600;
    box-shadow:0 6px 24px rgba(15,23,42,.15); animation:ep-fadein .25s ease both;
  }
  .ep-toast-success { background:#dcfce7; color:#15803d; border:1.5px solid #bbf7d0; }
  .ep-toast-error   { background:#fee2e2; color:#dc2626; border:1.5px solid #fecaca; }

  .ep-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
  .ep-page-sub    { font-size:1.05rem; color:#64748b; margin:0; }
  .ep-add-btn {
    background:#1e40af; color:#fff; border:none; border-radius:10px;
    padding:10px 20px; font-size:1.05rem; font-weight:600; cursor:pointer;
    white-space:nowrap; transition:background .15s;
  }
  .ep-add-btn:hover { background:#1d4ed8; }

  /* Search */
  .ep-search-wrap { position:relative; margin-bottom:16px; }
  .ep-search-icon {
    position:absolute; left:14px; top:50%;
    transform:translateY(-50%); font-size:1.125rem; pointer-events:none;
  }
  .ep-search {
    width:100%; box-sizing:border-box;
    padding:11px 16px 11px 42px; font-size:1.05rem;
    border:1.5px solid #e2e8f0; border-radius:10px;
    background:#fff; color:#1e293b; outline:none;
    transition:border-color .15s, box-shadow .15s;
  }
  .ep-search:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
  .ep-search::placeholder { color:#94a3b8; }

  /* Chips */
  .ep-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
  .ep-chip {
    display:flex; align-items:center; gap:5px;
    padding:7px 14px; font-size:.975rem; font-weight:500;
    background:#fff; color:#475569;
    border:1.5px solid #e2e8f0; border-radius:20px;
    cursor:pointer; transition:all .15s;
  }
  .ep-chip:hover { border-color:#93c5fd; color:#1e40af; background:#f0f7ff; }
  .ep-chip-active { background:var(--chip-color,#3b82f6)!important; color:#fff!important; border-color:transparent!important; }

  /* Count */
  .ep-count { font-size:1.0126rem; color:#64748b; margin:0 0 16px; }
  .ep-count strong { color:#1e293b; }

  /* Grid */
  .ep-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  @media(max-width:1100px){ .ep-grid{ grid-template-columns:repeat(2,1fr); } }
  @media(max-width:640px) { .ep-grid{ grid-template-columns:1fr; } }

  /* Card */
  @keyframes ep-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .ep-card {
    background:#fff; border:1.5px solid #e8edf3; border-radius:14px;
    overflow:hidden; padding:0;
    display:flex; flex-direction:column;
    transition:box-shadow .18s, transform .18s; animation:ep-fadein .35s ease both;
  }
  .ep-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.09); transform:translateY(-2px); }

  /* Card image banner */
  .ep-card-img-wrap { width:100%; height:160px; overflow:hidden; flex-shrink:0; }
  .ep-card-img { width:100%; height:100%; object-fit:cover; display:block; }

  /* Card body padding — applied per-row since overflow:hidden clips absolute card padding */
  .ep-card-top     { padding:14px 18px 0; }
  .ep-card-name    { padding:6px 18px 0; }
  .ep-card-meta    { padding:2px 18px 0; }
  .ep-card-details { padding:4px 18px 0; margin:0; }
  .ep-card-footer  { padding:4px 18px 14px; margin-top:4px; }

  .ep-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
  .ep-card-top-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
  .ep-card-icon { font-size:2.4rem; line-height:1; }

  /* Admin edit/delete on card */
  .ep-admin-btns { display:flex; gap:4px; }
  .ep-edit-btn, .ep-del-btn {
    background:none; border:1.5px solid #e2e8f0; border-radius:7px;
    padding:3px 7px; font-size:.9rem; cursor:pointer; transition:all .15s;
    line-height:1;
  }
  .ep-edit-btn:hover { background:#eff6ff; border-color:#bfdbfe; }
  .ep-del-btn:hover  { background:#fee2e2; border-color:#fecaca; }

  .ep-badge     { font-size:.825rem; font-weight:600; padding:3px 9px; border-radius:6px; }
  .ep-card-name { font-size:1.125rem; font-weight:600; color:#1e293b; margin:0 0 2px; }
  .ep-card-meta { font-size:.9376rem; color:#64748b; display:flex; align-items:center; gap:4px; margin:0; }
  .ep-meta-icon { font-size:.975rem; }

  .ep-card-details {
    display:flex; flex-direction:column; gap:4px;
    padding-top:8px; padding-bottom:8px;
    background:#f8fafc; border-radius:8px; border:1px solid #f1f5f9;
    margin-left:18px; margin-right:18px;
  }
  .ep-card-detail-item { font-size:.9rem; color:#475569; display:flex; align-items:center; gap:5px; }
  .ep-inline-24h {
    background:#dcfce7; color:#15803d;
    font-size:.8rem; font-weight:700; padding:1px 7px; border-radius:5px;
  }

  .ep-card-footer { display:flex; align-items:center; justify-content:space-between; }
  .ep-stars       { color:#f59e0b; font-size:.9376rem; display:flex; align-items:center; gap:2px; }
  .ep-rating-num  { color:#475569; font-size:.9rem; margin-left:4px; }

  .ep-info-btn {
    display:inline-flex; align-items:center; gap:4px;
    background:#eff6ff; color:#2563eb;
    border:1.5px solid #bfdbfe; border-radius:8px;
    padding:5px 12px; font-size:.875rem; font-weight:600;
    cursor:pointer; transition:background .15s, transform .15s;
  }
  .ep-info-btn:hover { background:#dbeafe; transform:translateY(-1px); }

  .ep-empty {
    text-align:center; padding:48px; color:#94a3b8;
    font-size:1.05rem; background:#fff; border-radius:14px;
    border:1.5px dashed #e2e8f0;
  }

  /* ── Modals ─────────────────────────────────────── */
  .ep-modal-bg {
    position:fixed; inset:0; z-index:2000;
    background:rgba(15,23,42,.45);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .ep-modal {
    background:#fff; border-radius:18px; padding:28px;
    width:480px; max-width:95vw;
    box-shadow:0 24px 60px rgba(15,23,42,.2);
    position:relative; animation:ep-fadein .25s ease both;
  }
  .ep-form-modal { width:560px; }
  .ep-del-modal  { width:400px; text-align:center; }

  .ep-modal-close-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .ep-form-title { font-size:1.35rem; font-weight:700; color:#0f172a; margin:0; }

  .ep-modal-close {
    background:#f1f5f9; border:none; border-radius:50%;
    width:32px; height:32px; font-size:.95rem; cursor:pointer; color:#64748b;
    display:flex; align-items:center; justify-content:center; transition:background .15s;
    flex-shrink:0;
  }
  .ep-modal-close:hover { background:#e2e8f0; }

  /* Info modal */
  .ep-modal-header { display:flex; align-items:flex-start; gap:16px; margin-bottom:16px; }
  .ep-modal-icon   { font-size:3rem; line-height:1; background:#f8fafc; border-radius:14px; padding:10px; flex-shrink:0; }
  .ep-modal-title-block { display:flex; flex-direction:column; gap:5px; }
  .ep-modal-name   { font-size:1.3rem; font-weight:700; color:#0f172a; margin:4px 0 0; }
  .ep-modal-address{ font-size:.95rem; color:#64748b; margin:0; }
  .ep-modal-divider{ height:1px; background:#f1f5f9; margin:16px 0; }
  .ep-modal-rows   { display:flex; flex-direction:column; gap:14px; }
  .ep-modal-row    { display:flex; align-items:flex-start; gap:12px; }
  .ep-modal-row-icon{ font-size:1.25rem; width:32px; text-align:center; flex-shrink:0; margin-top:2px; }
  .ep-modal-label  { font-size:.8rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; margin:0 0 3px; }
  .ep-modal-value  { font-size:1.05rem; font-weight:600; color:#1e293b; margin:0; }
  .ep-phone-link   { color:#2563eb; text-decoration:none; transition:color .15s; }
  .ep-phone-link:hover { color:#1d4ed8; text-decoration:underline; }
  .ep-badge-24h    { display:inline-block; background:#dcfce7; color:#15803d; font-size:.9rem; font-weight:700; padding:2px 10px; border-radius:6px; }
  .ep-modal-actions{ display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .ep-btn-close    { background:#f1f5f9; color:#475569; border:none; border-radius:9px; padding:10px 20px; font-size:1rem; font-weight:500; cursor:pointer; transition:background .15s; }
  .ep-btn-close:hover { background:#e2e8f0; }

  /* Form */
  .ep-form { display:flex; flex-direction:column; gap:12px; max-height:70vh; overflow-y:auto; padding-right:4px; }
  .ep-form-row   { display:flex; gap:12px; }
  .ep-form-group { display:flex; flex-direction:column; gap:5px; }
  .ep-form-grow  { flex:1; min-width:0; }
  .ep-form-group label { font-size:.9rem; font-weight:600; color:#374151; }
  .ep-form-group input, .ep-form-group select {
    padding:9px 12px; font-size:1rem; font-family:inherit;
    border:1.5px solid #e2e8f0; border-radius:8px; outline:none;
    transition:border-color .15s; background:#fff; color:#1e293b;
    box-sizing:border-box; width:100%;
  }
  .ep-form-group input:focus, .ep-form-group select:focus { border-color:#3b82f6; }
  .ep-form-error { font-size:.9rem; color:#dc2626; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; margin:0; }
  .ep-form-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .ep-btn-cancel { padding:9px 18px; font-size:1rem; font-weight:500; background:#f1f5f9; color:#475569; border:none; border-radius:8px; cursor:pointer; }
  .ep-btn-save   { padding:9px 18px; font-size:1rem; font-weight:600; background:#1e40af; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .ep-btn-save:hover   { background:#1d4ed8; }
  .ep-btn-save:disabled{ opacity:.6; cursor:not-allowed; }

  /* Image upload in form */
  .ep-img-upload-label { display:inline-block; cursor:pointer; }
  .ep-img-upload-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; font-size:.975rem; font-weight:500;
    background:#f1f5f9; color:#475569;
    border:1.5px dashed #cbd5e1; border-radius:8px;
    cursor:pointer; transition:all .15s;
  }
  .ep-img-upload-btn:hover { background:#e0e7ff; border-color:#a5b4fc; color:#3730a3; }
  .ep-img-preview-wrap { position:relative; display:inline-block; margin-top:8px; }
  .ep-img-preview { max-width:100%; max-height:160px; border-radius:8px; border:1.5px solid #e2e8f0; display:block; object-fit:cover; }
  .ep-img-remove {
    position:absolute; top:6px; right:6px;
    background:rgba(15,23,42,.65); color:#fff;
    border:none; border-radius:6px; padding:3px 9px;
    font-size:.8rem; font-weight:600; cursor:pointer;
    transition:background .15s;
  }
  .ep-img-remove:hover { background:rgba(220,38,38,.85); }

  /* Info modal image */
  .ep-modal-img-wrap { margin:-28px -28px 20px; border-radius:18px 18px 0 0; overflow:hidden; height:200px; }
  .ep-modal-img { width:100%; height:100%; object-fit:cover; display:block; }

  /* Delete modal */
  .ep-del-icon  { font-size:2.8rem; margin-bottom:10px; }
  .ep-del-title { font-size:1.35rem; font-weight:700; color:#0f172a; margin:0 0 10px; }
  .ep-del-body  { font-size:1rem; color:#64748b; margin:0; line-height:1.5; }
  .ep-btn-delete{ padding:9px 18px; font-size:1rem; font-weight:600; background:#dc2626; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:background .15s; }
  .ep-btn-delete:hover   { background:#b91c1c; }
  .ep-btn-delete:disabled{ opacity:.6; cursor:not-allowed; }
`;
