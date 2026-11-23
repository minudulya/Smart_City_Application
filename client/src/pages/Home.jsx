import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const categories = ['Bank', 'Station', 'Police Station', 'Gas Station', 'Market', 'Park'];

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams();
    if (search) query.set('q', search);
    if (category) query.set('category', category);

    fetch(`/api/places?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPlaces(data);
        if (!selectedPlace && data.length > 0) {
          setSelectedPlace(data[0]);
        }
      })
      .catch(console.error);
  }, [search, category]);

  const showOnMap = place => {
    setSelectedPlace(place);
  };

  const mapQuery = selectedPlace
    ? `${selectedPlace.lat},${selectedPlace.lng}`
    : 'Colombo+Sri+Lanka';

  const statCards = [
    { title: 'City Services', value: places.length || 64, note: 'Accessible locations across Colombo', accent: 'accent-blue' },
    { title: 'Active Alerts', value: '4', note: 'Safety and transit notices', accent: 'accent-teal' },
    { title: 'Transit Lines', value: '18', note: 'Local train and bus routes', accent: 'accent-purple' }
  ];

  const roleIntro = user?.role === 'merchant'
    ? 'Merchant dashboard with quick access to ads, requests, and city business services.'
    : user?.role === 'admin'
      ? 'Admin dashboard with city management tools for announcements, requests, issues, ads, and transit.'
      : 'Resident dashboard with access to reports, requests, and nearby city locations.';

  return (
    <div className="home-grid">
      <section className="hero page-card full-width">
        <div>
          <p className="page-section">Welcome back</p>
          <h2>{user?.name || 'Colombo City Resident'}</h2>
          <p className="muted">{roleIntro}</p>
        </div>
        <div>
          <img src="/assets/hero.svg" alt="Colombo city landmark" />
        </div>
      </section>

      <section className="dashboard-grid">
        {statCards.map(card => (
          <div key={card.title} className={`stat-card ${card.accent}`}>
            <div>
              <h3>{card.title}</h3>
              <p className="stat-note">{card.note}</p>
            </div>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="quick-actions">
        <div className="quick-card">
          <div>
            <h4>Find nearby services</h4>
            <p>Search Colombo facilities and discover the closest banks, markets, transit hubs and parks.</p>
          </div>
          <button className="action-button" type="button" onClick={() => document.getElementById('search-places')?.scrollIntoView({ behavior: 'smooth' })}>Search now</button>
        </div>
        <div className="quick-card">
          <div>
            <h4>Report an issue</h4>
            <p>Tell city staff about road, lighting, waste or public safety concerns in your area.</p>
          </div>
          <button className="action-button" type="button" onClick={() => navigate('/report-issue')}>Report issue</button>
        </div>
        <div className="quick-card">
          <div>
            <h4>{user?.role === 'merchant' ? 'Promote your store' : 'Make a request'}</h4>
            <p>{user?.role === 'merchant' ? 'Create local advertisements for Colombo visitors.' : 'Request permits, data access, or city services.'}</p>
          </div>
          <button className="action-button" type="button" onClick={() => navigate(user?.role === 'merchant' ? '/ads' : '/request-data')}>Go to dashboard</button>
        </div>
      </section>

      <section className="page-card full-width" id="search-places">
        <div className="page-title-block">
          <div>
            <h2>Search City Places</h2>
            <p className="muted">Filter by category or type a place name to quickly locate what you need in Colombo.</p>
          </div>
          <button className="page-action-button" type="button">Refresh map</button>
        </div>

        <div className="form-field">
          <label>Search places</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or address" />
        </div>

        <div className="chips">
          {categories.map(item => (
            <button
              key={item}
              type="button"
              className={`chip${category === item ? ' active' : ''}`}
              onClick={() => setCategory(category === item ? '' : item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="card-list">
          {places.length === 0 ? (
            <div className="card-item">No places found. Try a different search or category.</div>
          ) : places.map(place => (
            <div key={place.id} className="card-item location-card">
              <div>
                <h3>{place.name}</h3>
                <p className="place-meta"><strong>Category:</strong> {place.category}</p>
                <p className="place-meta"><strong>Address:</strong> {place.address}</p>
              </div>
              <button type="button" onClick={() => showOnMap(place)} className="map-btn">
                <span className="map-icon">📍</span>
                Show on map
              </button>
            </div>
          ))}
        </div>

        <div className="card-item map-card" style={{ padding: 0, marginTop: '1.5rem' }}>
          <iframe
            className="map-frame"
            title="Colombo location map"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            loading="lazy"
          />
          {selectedPlace && (
            <div className="place-selected">
              <strong>Showing:</strong> {selectedPlace.name}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
