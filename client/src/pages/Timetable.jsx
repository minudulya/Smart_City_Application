import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiGet, apiPost } from '../api';

const EMPTY_FORM = { mode: 'train', route: '', departure_times: [''], arrival_times: [''] };

function normalizeTimes(values) {
  return (values || []).map(item => item.trim()).filter(Boolean);
}

function RouteCard({ route, mode, onEdit, onDelete, isAdmin }) {
  const departures = normalizeTimes(route.departure_times);
  const arrivals = normalizeTimes(route.arrival_times);

  return (
    <div className="tt-card">
      <div className="tt-card-head">
        <div className="tt-route-row">
          <span className="tt-route-name">{route.route}</span>
          <span className="tt-platform">{mode === 'train' ? 'Train' : 'Bus'}</span>
        </div>
        <div className="tt-meta-row">
          <span className="tt-meta">🕐 {route.time || 'Pending'}</span>
        </div>
      </div>

      <div className="tt-departures">
        <div className="tt-dep-label">DEPARTURES</div>
        <div className="tt-times">
          {departures.length > 0 ? departures.map(time => <span key={time} className="tt-time">{time}</span>) : <span className="tt-time">No departures listed</span>}
        </div>

        <div className="tt-dep-label">ARRIVALS</div>
        <div className="tt-times">
          {arrivals.length > 0 ? arrivals.map(time => <span key={time} className="tt-time">{time}</span>) : <span className="tt-time">No arrivals listed</span>}
        </div>

        {isAdmin && (
          <div className="tt-card-actions">
            <button className="tt-action-btn tt-action-btn-edit" onClick={() => onEdit(route)}>
              Edit
            </button>
            <button className="tt-action-btn tt-action-btn-delete" onClick={() => onDelete(route.id)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('train');
  const [entries, setEntries] = useState({ train: [], bus: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchDest, setSearchDest] = useState('');

  useEffect(() => {
    loadTimetable();
  }, []);

  async function loadTimetable() {
    setLoading(true);
    try {
      const data = await apiGet('/api/timetable');
      setEntries({
        train: (data?.train || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
        bus: (data?.bus || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
      });
    } catch (error) {
      console.error(error);
      setEntries({ train: [], bus: [] });
    } finally {
      setLoading(false);
    }
  }

  const routes = tab === 'train' ? entries.train : entries.bus;

  function arrivalFromRoute(routeStr) {
    if (!routeStr) return '';
    const parts = routeStr.split(/->|→|–|—/);
    return parts.length > 1 ? parts[parts.length - 1].trim() : routeStr.trim();
  }

  const displayedRoutes = routes.filter(r => {
    if (!searchDest || !searchDest.trim()) return true;
    const arrival = arrivalFromRoute(r.route || '');
    return arrival.toLowerCase().includes(searchDest.toLowerCase());
  });

  function openAdd(mode) {
    setForm({ mode, route: '', departure_times: [''], arrival_times: [''] });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(mode, route) {
    setForm({
      mode,
      route: route.route,
      departure_times: route.departure_times?.length ? route.departure_times : [''],
      arrival_times: route.arrival_times?.length ? route.arrival_times : [''],
    });
    setEditingId(route.id);
    setModalOpen(true);
  }

  function updateTimeList(type, index, value) {
    const nextValues = [...form[type]];
    nextValues[index] = value;
    setForm({ ...form, [type]: nextValues });
  }

  function addTimeField(type) {
    setForm({ ...form, [type]: [...form[type], ''] });
  }

  function clearTimeField(type, index) {
    const nextValues = [...form[type]];
    nextValues[index] = '';
    setForm({ ...form, [type]: nextValues });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanDepartureTimes = normalizeTimes(form.departure_times);
    const cleanArrivalTimes = normalizeTimes(form.arrival_times);

    if (!form.route.trim() || (cleanDepartureTimes.length === 0 && cleanArrivalTimes.length === 0)) {
      return;
    }

    const previousEntries = entries;
    const nextEntries = {
      ...entries,
      [form.mode]: editingId
        ? entries[form.mode].map(item => item.id === editingId
          ? {
              ...item,
              route: form.route.trim(),
              departure_times: cleanDepartureTimes,
              arrival_times: cleanArrivalTimes,
              time: cleanDepartureTimes[0] || '',
            }
          : item)
        : [...entries[form.mode], {
            id: Date.now(),
            route: form.route.trim(),
            departure_times: cleanDepartureTimes,
            arrival_times: cleanArrivalTimes,
            time: cleanDepartureTimes[0] || '',
          }],
    };

    setSaving(true);
    setEntries(nextEntries);

    try {
      const data = await apiPost('/api/timetable/update', {
        train: nextEntries.train,
        bus: nextEntries.bus,
      });
      setEntries({
        train: (data?.train || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
        bus: (data?.bus || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (error) {
      console.error(error);
      setEntries(previousEntries);
      window.alert(error.message || 'Unable to save timetable entry.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(routeId) {
    setDeleteConfirm(routeId);
  }

  async function confirmDelete() {
    const routeId = deleteConfirm;
    if (routeId == null) {
      return;
    }

    const mode = tab;
    const previousEntries = entries;
    const nextEntries = {
      ...entries,
      [mode]: entries[mode].filter(item => item.id !== routeId),
    };

    setEntries(nextEntries);
    setDeleteConfirm(null);

    try {
      const data = await apiPost('/api/timetable/update', {
        train: nextEntries.train,
        bus: nextEntries.bus,
      });
      setEntries({
        train: (data?.train || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
        bus: (data?.bus || []).map(entry => ({
          ...entry,
          departure_times: entry.departure_times || [],
          arrival_times: entry.arrival_times || [],
        })),
      });
    } catch (error) {
      console.error(error);
      setEntries(previousEntries);
      window.alert(error.message || 'Unable to delete timetable entry.');
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="tt-wrap">
        <div className="tt-header">
          <p className="tt-sub">Train and bus timetables · Add several departures and arrivals</p>
        </div>

        

        <div className="tt-controls">
          <div className="tt-tabs">
            <button className={`tt-tab${tab === 'train' ? ' tt-tab-active' : ''}`} onClick={() => setTab('train')}>
              🚂 Trains
            </button>
            <button className={`tt-tab${tab === 'bus' ? ' tt-tab-active' : ''}`} onClick={() => setTab('bus')}>
              🚌 Buses
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input
              className="tt-search"
              type="text"
              placeholder="Search arrival destination..."
              value={searchDest}
              onChange={e => setSearchDest(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button className="tt-add-btn" onClick={() => openAdd(tab)}>
              + Add {tab === 'train' ? 'Train' : 'Bus'} Entry
            </button>
          )}
        </div>

        {loading ? (
          <p className="tt-empty">Loading timetable…</p>
        ) : routes.length === 0 ? (
          <p className="tt-empty">No timetable entries available yet.</p>
        ) : displayedRoutes.length === 0 ? (
          <p className="tt-empty">No matching arrivals.</p>
        ) : (
          <div className="tt-grid">
            {displayedRoutes.map((route, index) => (
              <div key={route.id} style={{ animationDelay: `${index * 60}ms` }}>
                <RouteCard
                  route={route}
                  mode={tab}
                  onEdit={(item) => openEdit(tab, item)}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="tt-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="tt-modal" onClick={event => event.stopPropagation()}>
            <h3>{editingId ? 'Edit' : 'Add'} {form.mode === 'train' ? 'Train' : 'Bus'} Entry</h3>
            <form onSubmit={handleSubmit}>
              <label className="tt-field">
                <span>Route</span>
                <input
                  value={form.route}
                  onChange={event => setForm({ ...form, route: event.target.value })}
                  placeholder="e.g. Colombo Fort → Kandy"
                  required
                />
              </label>

              <div className="tt-field">
                <span>Departure times</span>
                {form.departure_times.map((value, index) => (
                  <div key={`dep-${index}`} className="tt-time-row">
                    <input
                      value={value}
                      onChange={event => updateTimeList('departure_times', index, event.target.value)}
                      placeholder="e.g. 06:30"
                    />
                    <button
                      type="button"
                      className="tt-inline-btn"
                      onClick={() => clearTimeField('departure_times', index)}
                      aria-label="Clear departure time"
                    >
                      Clear
                    </button>
                  </div>
                ))}
                <button type="button" className="tt-inline-add" onClick={() => addTimeField('departure_times')}>
                  + Add departure time
                </button>
              </div>

              <div className="tt-field">
                <span>Arrival times</span>
                {form.arrival_times.map((value, index) => (
                  <div key={`arr-${index}`} className="tt-time-row">
                    <input
                      value={value}
                      onChange={event => updateTimeList('arrival_times', index, event.target.value)}
                      placeholder="e.g. 08:50"
                    />
                    <button
                      type="button"
                      className="tt-inline-btn"
                      onClick={() => clearTimeField('arrival_times', index)}
                      aria-label="Clear arrival time"
                    >
                      Clear
                    </button>
                  </div>
                ))}
                <button type="button" className="tt-inline-add" onClick={() => addTimeField('arrival_times')}>
                  + Add arrival time
                </button>
              </div>

              <div className="tt-modal-actions">
                <button type="button" className="tt-action-btn tt-action-btn-delete" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="tt-action-btn tt-action-btn-edit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="tt-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="tt-confirm-modal" onClick={event => event.stopPropagation()}>
            <h3>Delete timetable entry?</h3>
            <p>This will remove the selected timetable information from the list.</p>
            <div className="tt-modal-actions">
              <button type="button" className="tt-action-btn tt-action-btn-edit" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button type="button" className="tt-action-btn tt-action-btn-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .tt-wrap { padding: 8px 0 48px; }
  .tt-header { margin-bottom: 20px; }
  .tt-sub { font-size: 1.05rem; color: #64748b; margin: 0; }

  .tt-notice {
    display: flex; align-items: flex-start; gap: 10px;
    background: #eff6ff; border: 1.5px solid #bfdbfe;
    border-radius: 10px; padding: 14px 18px;
    font-size: 1.0126rem; color: #1e40af;
    margin-bottom: 20px; line-height: 1.5;
  }
  .tt-notice-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }

  .tt-controls { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .tt-tabs { display: flex; gap: 8px; }
  .tt-tab {
    padding: 8px 20px; font-size: 1.0126rem; font-weight: 500;
    background: #fff; color: #475569;
    border: 1.5px solid #e2e8f0; border-radius: 20px;
    cursor: pointer; transition: all .15s;
    display: flex; align-items: center; gap: 6px;
  }
  .tt-tab:hover { border-color: #93c5fd; color: #1e40af; }
  .tt-tab-active { background: #1e3a5f !important; color: #fff !important; border-color: transparent !important; }

  .tt-add-btn, .tt-action-btn, .tt-inline-add, .tt-inline-btn {
    border: none; border-radius: 999px; cursor: pointer; font-weight: 600;
  }
  .tt-add-btn { background: #1e3a5f; color: #fff; padding: 8px 14px; }
  .tt-action-btn-edit { background: #2563eb; color: #fff; padding: 8px 14px; }
  .tt-action-btn-delete { background: #ef4444; color: #fff; padding: 8px 14px; }
  .tt-action-btn:disabled { opacity: 0.7; cursor: wait; }
  .tt-inline-add { background: #e0f2fe; color: #075985; padding: 6px 10px; margin-top: 6px; }
  .tt-inline-btn { background: #fee2e2; color: #b91c1c; padding: 8px 12px; min-width: 72px; height: auto; }

  .tt-search { width: 100%; max-width: 420px; box-sizing: border-box; padding:9px 12px; font-size:1rem; border:1.5px solid #e2e8f0; border-radius:8px; outline:none; }
  .tt-search:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }

  .tt-empty { color: #64748b; background: #f8fafc; padding: 16px; border-radius: 10px; }

  .tt-confirm-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
    display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px;
  }
  .tt-confirm-modal {
    background: #fff; border-radius: 14px; padding: 22px 24px; width: 100%; max-width: 380px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  }
  .tt-confirm-modal h3 { margin: 0 0 8px; color: #0f172a; }
  .tt-confirm-modal p { margin: 0 0 16px; color: #64748b; line-height: 1.5; }

  @keyframes tt-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  .tt-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 1100px) { .tt-grid { grid-template-columns: repeat(2,1fr); } }
  @media (max-width: 640px)  { .tt-grid { grid-template-columns: 1fr; } }

  .tt-card {
    border-radius: 14px; overflow: hidden;
    border: 1.5px solid #1e3a6e;
    animation: tt-in .35s ease both;
    box-shadow: 0 2px 12px rgba(15,23,42,.12);
  }

  .tt-card-head {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
    padding: 18px 18px 14px; color: #fff;
  }
  .tt-route-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 8px; margin-bottom: 10px;
  }
  .tt-route-name { font-size: 1.125rem; font-weight: 700; line-height: 1.3; }
  .tt-platform {
    font-size: 0.825rem; font-weight: 600; white-space: nowrap;
    background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
    border-radius: 5px; padding: 3px 8px; margin-top: 1px;
  }
  .tt-meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .tt-meta {
    font-size: 0.9rem; background: rgba(255,255,255,.12);
    border-radius: 5px; padding: 3px 9px;
  }

  .tt-departures { background: #fff; padding: 16px 18px 14px; }
  .tt-dep-label {
    font-size: 0.75rem; font-weight: 700; letter-spacing: .08em;
    color: #94a3b8; margin-bottom: 10px;
  }
  .tt-times { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .tt-time {
    font-size: 0.975rem; font-weight: 600; color: #1e293b;
    background: #f1f5f9; border-radius: 6px; padding: 4px 10px;
  }
  .tt-card-actions { display: flex; gap: 8px; margin-top: 10px; }

  .tt-modal-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50;
  }
  .tt-modal {
    background: #fff; width: min(100%, 480px); max-height: 90vh; overflow-y: auto; border-radius: 14px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,.2);
  }
  .tt-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .tt-field span { font-weight: 600; color: #334155; }
  .tt-field input {
    border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 1rem; width: 100%;
  }
  .tt-time-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .tt-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
`;
