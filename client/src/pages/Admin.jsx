import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../api';


const STATUS_STYLES = {
  'Open':        { bg:'#fff7ed', text:'#c2410c', border:'#fed7aa' },
  'In Progress': { bg:'#eff6ff', text:'#2563eb', border:'#bfdbfe' },
  'Resolved':    { bg:'#f0fdf4', text:'#16a34a', border:'#bbf7d0' },
  'Pending':     { bg:'#fff7ed', text:'#c2410c', border:'#fed7aa' },
  'Published':   { bg:'#f0fdf4', text:'#16a34a', border:'#bbf7d0' },
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues,         setIssues]         = useState([]);
  const [requests,       setRequests]       = useState([]);
  const [ads,            setAds]            = useState([]);
  const [announcements,  setAnnouncements]  = useState([]);

  useEffect(() => {
    if (!user) return;
    apiGet('/api/issues').then(d => { if(Array.isArray(d)) setIssues(d); }).catch(()=>{});
    apiGet('/api/requests').then(d => { if(Array.isArray(d)) setRequests(d); }).catch(()=>{});
    apiGet('/api/ads').then(d => { if(Array.isArray(d)) setAds(d); }).catch(()=>{});
    apiGet('/api/announcements').then(d => { if (Array.isArray(d)) setAnnouncements(d); }).catch(()=>{});
  }, [user]);

  // Build recent activity feed from real fetched data
  const recentActivity = useMemo(() => [
    ...issues.map(i => ({ text: `Issue reported: "${i.issue?.slice(0, 45)}"`, time: i.created_at, icon: '⚠️' })),
    ...requests.map(r => ({ text: `${r.request_type} request by ${r.name}`, time: r.created_at, icon: '📋' })),
    ...ads.map(a => ({ text: `Ad submitted: "${a.title?.slice(0, 40)}"`, time: a.created_at, icon: '📢' })),
  ]
    .filter(a => a.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5),
  [issues, requests, ads]);

  const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });

  const openIssues   = issues.filter(i => i.status === 'Open').length;
  const inProgress   = issues.filter(i => i.status === 'In Progress').length;
  const pendingReqs  = requests.filter(r => r.status === 'Pending').length;
  const adsForReview = ads.filter(a => a.status === 'Pending').length;

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const announcementCount = announcements.length;
  const STAT_CARDS = [
    { value: openIssues,       label: 'Open Issues',       icon: '🚨', iconBg: '#fee2e2', color: '#dc2626' },
    { value: inProgress,       label: 'In Progress',       icon: '🔧', iconBg: '#e0e7ff', color: '#4f46e5' },
    { value: pendingReqs,      label: 'Pending Requests',  icon: '📋', iconBg: '#fef3c7', color: '#d97706' },
    { value: announcementCount, label: 'Announcements',     icon: '📢', iconBg: '#dcfce7', color: '#16a34a' },
  ];

  const publishAd = async id => {
    try {
      const updated = await apiPost(`/api/ads/${id}/publish`);
      setAds(prev => prev.map(a => a.id===updated.id ? updated : a));
    } catch { setAds(prev => prev.map(a => a.id===id ? {...a, status:'Published'} : a)); }
  };
  const removeAd = async id => {
    try { await apiDelete(`/api/ads/${id}`); } catch {}
    setAds(prev => prev.filter(a => a.id!==id));
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ad-wrap">

        <div className="ad-page-header">
          <div>
            <p className="ad-sub">City management overview — {today}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="ad-stats">
          {STAT_CARDS.map((s, i) => (
            <div className="ad-stat-card" key={i}>
              <div className="ad-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
              <div className="ad-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="ad-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-col panels */}
        <div className="ad-panels">

          {/* Recent Issues */}
          <div className="ad-panel">
            <div className="ad-panel-header">
              <span className="ad-panel-title">Recent Issues</span>
              <button className="ad-view-all" onClick={() => navigate('/report-issue')}>View all →</button>
            </div>
            <div className="ad-panel-list">
              {issues.slice(0,4).map(issue => {
                const st = STATUS_STYLES[issue.status] ?? {};
                return (
                  <div className="ad-list-row" key={issue.id}>
                    <div className="ad-list-left">
                      <p className="ad-list-title">{issue.issue}</p>
                      <p className="ad-list-meta">{issue.ago} · {issue.category}</p>
                    </div>
                    <span className="ad-status-pill" style={{ background: st.bg, color: st.text, border:`1px solid ${st.border}` }}>{issue.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Requests */}
          <div className="ad-panel">
            <div className="ad-panel-header">
              <span className="ad-panel-title">Pending Requests</span>
              <button className="ad-view-all" onClick={() => navigate('/request-data')}>View all →</button>
            </div>
            <div className="ad-panel-list">
              {requests.filter(r => r.status === 'Pending').map(req => {
                const st = STATUS_STYLES[req.status] ?? {};
                return (
                  <div className="ad-list-row" key={req.id}>
                    <div className="ad-list-left">
                      <p className="ad-list-title">{req.requestType}</p>
                      <p className="ad-list-meta">by {req.name} · {req.ago}</p>
                    </div>
                    <span className="ad-status-pill" style={{ background: st.bg, color: st.text, border:`1px solid ${st.border}` }}>{req.status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Latest Announcements */}
          <div className="ad-panel">
            <div className="ad-panel-header">
              <span className="ad-panel-title">Latest Announcements</span>
              <button className="ad-view-all" onClick={() => navigate('/announcements')}>View all →</button>
            </div>
            <div className="ad-panel-list">
              {announcements.slice(0, 4).map(item => {
                const date = new Date(item.created_at || item.createdAt).toLocaleDateString('en-GB');
                const description = (item.message || item.body || '').trim();
                return (
                  <div className="ad-list-row" key={item.id}>
                    <div className="ad-list-left">
                      <p className="ad-list-title">{item.title}</p>
                      <p className="ad-list-meta">{item.category} · {date}</p>
                      {description && <p className="ad-list-desc">{description}</p>}
                    </div>
                  </div>
                );
              })}
              {announcements.length === 0 && (
                <p className="ad-empty-note">No announcements posted yet.</p>
              )}
            </div>
          </div>

          {/* Ads Awaiting Approval */}
          <div className="ad-panel">
            <div className="ad-panel-header">
              <span className="ad-panel-title">Ads Awaiting Approval</span>
              <button className="ad-view-all" onClick={() => navigate('/ads')}>Manage →</button>
            </div>
            <div className="ad-panel-list">
              {ads.filter(a => a.status === 'Pending').map(ad => {
                const st = STATUS_STYLES[ad.status] ?? {};
                return (
                  <div className="ad-list-row" key={ad.id}>
                    <div className="ad-list-left">
                      <p className="ad-list-title">🗞 {ad.title}</p>
                      <p className="ad-list-meta">by {ad.author}</p>
                    </div>
                    <div className="ad-ad-actions">
                      <span className="ad-status-pill" style={{ background: st.bg, color: st.text, border:`1px solid ${st.border}` }}>{ad.status}</span>
                      <button className="ad-approve-btn" onClick={() => publishAd(ad.id)}>Approve</button>
                      <button className="ad-remove-btn"  onClick={() => removeAd(ad.id)}>Remove</button>
                    </div>
                  </div>
                );
              })}
              {ads.filter(a => a.status === 'Pending').length === 0 && (
                <p className="ad-empty-note">No ads awaiting approval.</p>
              )}
            </div>
          </div>

          {/* Recent Activity — derived from live issues, requests and ads */}
          <div className="ad-panel">
            <div className="ad-panel-header">
              <span className="ad-panel-title">Recent Activity</span>
            </div>
            <div className="ad-panel-list">
              {recentActivity.length === 0 ? (
                <p className="ad-empty-note">No recent activity.</p>
              ) : recentActivity.map((item, i) => (
                <div className="ad-activity-row" key={i}>
                  <span className="ad-activity-dot" />
                  <div>
                    <p className="ad-list-title">{item.icon} {item.text}</p>
                    <p className="ad-list-meta">{fmtDate(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

const CSS = `
  .ad-wrap { padding:8px 0 48px; }
  .ad-page-header { margin-bottom:24px; }
  .ad-title { font-size: 1.95rem; font-weight:700; color:#0f172a; margin:0 0 6px; letter-spacing:-0.3px; }
  .ad-sub   { font-size: 1.05rem; color:#64748b; margin:0; }
  .ad-list-desc { margin: 8px 0 0; color: #475569; font-size: 0.95rem; line-height: 1.5; }

  /* Stats */
  .ad-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
  @media(max-width:900px){ .ad-stats{ grid-template-columns:repeat(2,1fr); } }
  .ad-stat-card { background:#fff; border:1.5px solid #e8edf3; border-radius:14px; padding:22px 20px; display:flex; flex-direction:column; gap:8px; transition:box-shadow .18s; }
  .ad-stat-card:hover { box-shadow:0 4px 18px rgba(15,23,42,.07); }
  .ad-stat-icon  { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size: 1.65rem; }
  .ad-stat-value { font-size: 2.7rem; font-weight:800; line-height:1; }
  .ad-stat-label { font-size: 0.975rem; color:#64748b; }

  /* Two-col panels */
  .ad-panels { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  @media(max-width:900px){ .ad-panels{ grid-template-columns:1fr; } }

  .ad-panel { background:#fff; border:1.5px solid #e8edf3; border-radius:14px; padding:20px 22px; }
  .ad-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .ad-panel-title  { font-size: 1.125rem; font-weight:700; color:#1e293b; }
  .ad-view-all     { background:none; border:none; font-size: 0.975rem; font-weight:600; color:#3b82f6; cursor:pointer; padding:0; transition:color .15s; }
  .ad-view-all:hover { color:#1d4ed8; }

  .ad-panel-list { display:flex; flex-direction:column; gap:12px; }
  .ad-list-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:12px; border-bottom:1px solid #f1f5f9; }
  .ad-list-row:last-child { border-bottom:none; padding-bottom:0; }
  .ad-list-left   { flex:1; min-width:0; }
  .ad-list-title  { font-size: 1.0126rem; font-weight:600; color:#1e293b; margin:0 0 3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ad-list-meta   { font-size: 0.9rem; color:#94a3b8; margin:0; }
  .ad-status-pill { font-size: 0.8626rem; font-weight:600; padding:3px 10px; border-radius:6px; white-space:nowrap; flex-shrink:0; }

  .ad-ad-actions  { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .ad-approve-btn { font-size: 0.8626rem; font-weight:600; background:#dcfce7; color:#15803d; border:none; border-radius:6px; padding:4px 10px; cursor:pointer; transition:background .15s; }
  .ad-approve-btn:hover { background:#bbf7d0; }
  .ad-remove-btn  { font-size: 0.8626rem; font-weight:600; background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:4px 10px; cursor:pointer; transition:background .15s; }
  .ad-remove-btn:hover { background:#fecaca; }

  .ad-activity-row { display:flex; align-items:flex-start; gap:10px; padding-bottom:12px; border-bottom:1px solid #f1f5f9; }
  .ad-activity-row:last-child { border-bottom:none; padding-bottom:0; }
  .ad-activity-dot { width:8px; height:8px; border-radius:50%; background:#3b82f6; flex-shrink:0; margin-top:5px; }
  .ad-empty-note  { font-size: 0.975rem; color:#94a3b8; margin:0; }
`;
