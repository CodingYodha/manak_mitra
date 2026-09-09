import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, LoaderCircle, MapPin, Search, ShieldAlert, Sparkles, Navigation, Layers, Building2 } from 'lucide-react';

const apiUrl = (path) => `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')}${path}`;

// 6 BIS Apex Regional Testing Hubs & Reference Laboratories
const APEX_CENTERS = [
  {
    lab_id: 'apex-delhi',
    name: 'National Test House & Central Testing Lab (NR)',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    categories: 'electronics,toys,cement,electrical,solar,safety',
    isApex: true,
    apexTitle: 'BIS Northern Apex Hub'
  },
  {
    lab_id: 'apex-mumbai',
    name: 'BIS Western Regional Office Laboratory (WR)',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0760,
    lon: 72.8777,
    categories: 'gold,electronics,chemicals,steel,huid,automotive',
    isApex: true,
    apexTitle: 'BIS Western Apex Hub'
  },
  {
    lab_id: 'apex-bangalore',
    name: 'Central Power Research Institute (CPRI) / BIS South',
    city: 'Bangalore',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    categories: 'electronics,electrical,transformers,cables,batteries',
    isApex: true,
    apexTitle: 'BIS Southern Testing Hub'
  },
  {
    lab_id: 'apex-chennai',
    name: 'BIS Southern Regional Office Laboratory (CIT Campus)',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    categories: 'mechanical,chemical,microbiology,food,textiles',
    isApex: true,
    apexTitle: 'BIS Tamil Nadu Apex Hub'
  },
  {
    lab_id: 'apex-kolkata',
    name: 'BIS Eastern Regional Office Laboratory (Salt Lake)',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5726,
    lon: 88.3639,
    categories: 'metallurgy,steel,heavy testing,cement,plastics',
    isApex: true,
    apexTitle: 'BIS Eastern Apex Hub'
  },
  {
    lab_id: 'apex-sahibabad',
    name: 'BIS Central Laboratory (CL), Sahibabad',
    city: 'Sahibabad',
    state: 'Uttar Pradesh',
    lat: 28.6738,
    lon: 77.3489,
    categories: 'apex reference testing,electronics,appliances,chemical,cables',
    isApex: true,
    apexTitle: 'BIS Central Reference Apex Campus'
  }
];

// Fallback coordinates for Indian cities across the 341 indexed laboratories
const CITY_COORDS = {
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777],
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639],
  'sahibabad': [28.6738, 77.3489],
  'ghaziabad': [28.6692, 77.4538],
  'noida': [28.5355, 77.3910],
  'gurgaon': [28.4595, 77.0266],
  'gurugram': [28.4595, 77.0266],
  'faridabad': [28.4089, 77.3178],
  'hyderabad': [17.3850, 78.4867],
  'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714],
  'jaipur': [26.9124, 75.7873],
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'nagpur': [21.1458, 79.0882],
  'patna': [25.5941, 85.1376],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'vadodara': [22.3072, 73.1812],
  'surat': [21.1702, 72.8311],
  'visakhapatnam': [17.6868, 83.2185],
  'coimbatore': [11.0168, 76.9558],
  'chandigarh': [30.7333, 76.7794],
  'guwahati': [26.1445, 91.7362],
  'raipur': [21.2514, 81.6296],
  'bhubaneswar': [20.2961, 85.8245],
  'ranchi': [23.3441, 85.3096],
  'chittoor': [13.2172, 79.1003],
  'krishna': [16.1800, 81.1300],
  'vijayawada': [16.5062, 80.6480],
  'guntur': [16.3067, 80.4365],
  'tirupati': [13.6288, 79.4192],
  'daman': [20.3974, 72.8328]
};

// Create custom SVG Leaflet DivIcons
const createApexIcon = (title) => L.divIcon({
  className: 'apex-map-marker',
  html: `<div style="
    background: #ea580c;
    color: white;
    padding: 4px 8px;
    border-radius: 20px;
    border: 2px solid #ffffff;
    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.45);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    cursor: pointer;
    transform: translate(-50%, -50%);
  ">
    <span style="font-size: 12px;">⭐</span> ${title || 'BIS Apex'}
  </div>`,
  iconSize: [120, 30],
  iconAnchor: [60, 15]
});

const createLabIcon = (selected) => L.divIcon({
  className: 'standard-lab-marker',
  html: `<div style="
    background: ${selected ? '#2563eb' : '#059669'};
    width: ${selected ? '26px' : '20px'};
    height: ${selected ? '26px' : '20px'};
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    transition: all 0.2s ease;
  ">
    <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 6, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function LabLocator() {
  const [labs, setLabs] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ query: '', city: '', category: '' });
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [selectedLab, setSelectedLab] = useState(null);
  const [mapCenter, setMapCenter] = useState([22.5937, 78.9629]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState('loading');
      setError('');
      try {
        const params = new URLSearchParams({ limit: '50' });
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });

        // Query backend laboratory catalog
        const response = await fetch(apiUrl(`/api/labs?${params}`), { signal: controller.signal });
        if (!response.ok) throw new Error(`Laboratory service returned HTTP ${response.status}.`);
        const data = await response.json();

        setLabs(data.labs || []);
        setCities(data.cities || []);
        setCategories(data.categories || []);
        setTotal(data.total_indexed || 341);
        setState('ready');
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Unable to load the laboratory directory.');
          setState('error');
        }
      }
    }, filters.query ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters]);

  // Merge apex centers with loaded labs and attach coordinates
  const mappedLabs = useMemo(() => {
    const combined = [];
    const seenIds = new Set();

    // 1. Always feature apex centers matching filters
    APEX_CENTERS.forEach((apex) => {
      const matchCity = !filters.city || apex.city.toLowerCase().includes(filters.city.toLowerCase());
      const matchCat = !filters.category || apex.categories.toLowerCase().includes(filters.category.toLowerCase());
      const matchQ = !filters.query || (
        apex.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        apex.city.toLowerCase().includes(filters.query.toLowerCase()) ||
        apex.categories.toLowerCase().includes(filters.query.toLowerCase())
      );

      if (matchCity && matchCat && matchQ) {
        combined.push(apex);
        seenIds.add(apex.lab_id);
      }
    });

    // 2. Add labs from database with coordinates
    labs.forEach((lab) => {
      if (seenIds.has(lab.lab_id)) return;
      let lat = lab.lat;
      let lon = lab.lon;

      if (!lat || !lon) {
        const cityKey = (lab.city || '').toLowerCase().trim();
        if (CITY_COORDS[cityKey]) {
          // Slight jitter so pins in same city don't completely overlap
          const jitter = (parseInt(lab.lab_id.replace(/\D/g, '') || '1', 10) % 7 - 3) * 0.015;
          lat = CITY_COORDS[cityKey][0] + jitter;
          lon = CITY_COORDS[cityKey][1] + jitter;
        }
      }

      if (lat && lon) {
        combined.push({
          ...lab,
          lat,
          lon,
          isApex: false
        });
        seenIds.add(lab.lab_id);
      }
    });

    return combined;
  }, [labs, filters]);

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'city' && value && CITY_COORDS[value.toLowerCase()]) {
      setMapCenter(CITY_COORDS[value.toLowerCase()]);
      setMapZoom(10);
    }
  };

  const handleSelectLab = (lab) => {
    setSelectedLab(lab);
    if (lab.lat && lab.lon) {
      setMapCenter([lab.lat, lab.lon]);
      setMapZoom(12);
    }
  };

  const handleApexQuickFilter = (apex) => {
    setSelectedLab(apex);
    setMapCenter([apex.lat, apex.lon]);
    setMapZoom(12);
  };

  return (
    <div className="container section-rhythm" style={{ paddingTop: '32px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div>
          <span className="caption" style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} /> CURATED BIS LIMS LABORATORY DIRECTORY & MAP
          </span>
          <h2 className="display-md" style={{ marginTop: '4px', marginBottom: '6px' }}>
            Recognised BIS Testing Laboratories
          </h2>
          <p className="body-md" style={{ color: 'var(--color-muted)' }}>
            Interactive geographical map of <strong>{total || 341}</strong> BIS-recognised testing hubs and accredited laboratories across India.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input
              value={filters.query}
              onChange={(e) => setFilter('query', e.target.value)}
              placeholder="Lab, city, or scope…"
              className="editorial-input"
              style={{ paddingLeft: '30px', width: '200px' }}
            />
          </label>
          <select value={filters.city} onChange={(e) => setFilter('city', e.target.value)}>
            <option value="">All Cities ({cities.length || '90+'})</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All Testing Scopes ({categories.length || '30+'})</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Apex Hub Quick Navigation Pills */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#ea580c" /> APEX TESTING CENTERS & REGIONAL REFERENCE HUBS:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {APEX_CENTERS.map((apex) => (
            <button
              key={apex.lab_id}
              onClick={() => handleApexQuickFilter(apex)}
              style={{
                background: selectedLab?.lab_id === apex.lab_id ? '#ea580c' : '#fff7ed',
                color: selectedLab?.lab_id === apex.lab_id ? '#ffffff' : '#c2410c',
                border: '1px solid #fed7aa',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <MapPin size={12} /> {apex.city} ({apex.apexTitle.replace('BIS ', '').replace(' Hub', '')})
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <Layers size={16} color="#059669" /> Interactive Laboratory Geospatial Canvas
            <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px' }}>
              {mappedLabs.length} pins active
            </span>
          </div>
          <button
            onClick={() => { setMapCenter([22.5937, 78.9629]); setMapZoom(5); }}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Navigation size={11} /> Reset Pan & Zoom
          </button>
        </div>

        <div style={{ height: '420px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapRecenter center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mappedLabs.map((lab) => (
              <Marker
                key={lab.lab_id}
                position={[lab.lat, lab.lon]}
                icon={lab.isApex ? createApexIcon(lab.city) : createLabIcon(selectedLab?.lab_id === lab.lab_id)}
                eventHandlers={{
                  click: () => setSelectedLab(lab)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px', padding: '4px' }}>
                    {lab.isApex && (
                      <span style={{ fontSize: '10px', background: '#ffedd5', color: '#c2410c', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px' }}>
                        ⭐ {lab.apexTitle}
                      </span>
                    )}
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                      {lab.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                      <MapPin size={12} color="#ea580c" /> {lab.city}, {lab.state}
                    </div>
                    <div style={{ fontSize: '11px', color: '#334155', background: '#f1f5f9', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px' }}>
                      <strong>Indexed Scope:</strong> {lab.categories || 'General BIS Testing'}
                    </div>
                    <a
                      href="https://lims.bis.gov.in/"
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      Verify on BIS LIMS <ExternalLink size={12} />
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Status Messages */}
      {state === 'loading' && (
        <div style={{ padding: '18px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LoaderCircle size={17} className="spin" /> Updating laboratory registry…
        </div>
      )}
      {state === 'error' && (
        <div style={{ padding: '16px', borderRadius: '8px', color: '#991b1b', background: '#fef2f2', display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}
      {state === 'ready' && !mappedLabs.length && (
        <div className="editorial-chat-box" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          No indexed laboratory matches these filters. Try clearing city or scope.
        </div>
      )}

      {/* Laboratory Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {mappedLabs.map((lab) => {
          const isSelected = selectedLab?.lab_id === lab.lab_id;
          return (
            <div
              key={lab.lab_id}
              className="editorial-chat-box"
              style={{
                padding: '22px',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#f8faff' : '#ffffff',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '11px',
                  background: lab.isApex ? '#ffedd5' : '#f0fdf4',
                  color: lab.isApex ? '#c2410c' : '#166534',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {lab.isApex ? `⭐ ${lab.apexTitle}` : 'CURATED BIS LIMS LISTING'}
                </span>
                <button
                  onClick={() => handleSelectLab(lab)}
                  style={{
                    background: isSelected ? '#2563eb' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MapPin size={11} /> {isSelected ? 'Focused' : 'View on Map'}
                </button>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#181d26', margin: '12px 0 6px' }}>
                {lab.name}
              </h3>
              <div style={{ display: 'flex', gap: '6px', color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>
                <MapPin size={14} color="#2563eb" /> {lab.city}, {lab.state}
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                INDEXED TESTING SCOPE
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {(lab.categories || '').split(/[;,]/).filter(Boolean).map((cat) => (
                  <span key={cat} style={{ fontSize: '12px', background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                    {cat.trim()}
                  </span>
                ))}
              </div>

              <a
                href="https://lims.bis.gov.in/"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', gap: '4px', alignItems: 'center' }}
              >
                Check live scope in BIS LIMS <ExternalLink size={13} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

