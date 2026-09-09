import React, { useState, useEffect } from 'react';
import { MapPin, Search, ExternalLink, Building2, Phone, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '../../config';

const RECOGNISED_LABS = [
  {
    id: 'lab-del-1',
    name: 'National Test House (NR)',
    city: 'New Delhi',
    state: 'Delhi',
    address: 'Kamla Nehru Nagar, Ghaziabad / Delhi NCR',
    categories: ['Electronics', 'Toys', 'Cables', 'Cement'],
    phone: '011-23378456',
    email: 'nthnr-ca@nic.in',
    accreditation: 'NABL Accredited · BIS Recognized'
  },
  {
    id: 'lab-mum-1',
    name: 'BIS Western Regional Laboratory',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'MIDC Central Road, Andheri (East), Mumbai - 400093',
    categories: ['Gold Hallmarking', 'Electronics', 'Chemical'],
    phone: '022-28329295',
    email: 'wrl@bis.gov.in',
    accreditation: 'Official BIS Regional Central Facility'
  },
  {
    id: 'lab-blr-1',
    name: 'Central Power Research Institute (CPRI)',
    city: 'Bangalore',
    state: 'Karnataka',
    address: 'Prof. Sir C.V. Raman Road, Sadashivanagar, Bangalore - 560080',
    categories: ['Electronics', 'Lighting & LED', 'Power Equipment'],
    phone: '080-23602329',
    email: 'cpri@nic.in',
    accreditation: 'Apex Power & Lighting Test House'
  },
  {
    id: 'lab-chn-1',
    name: 'BIS Southern Regional Laboratory',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'CIT Campus, IV Cross Road, Taramani, Chennai - 600113',
    categories: ['Toys', 'Plastics', 'Civil Materials'],
    phone: '044-22541442',
    email: 'srl@bis.gov.in',
    accreditation: 'NABL Accredited Facility'
  },
  {
    id: 'lab-kol-1',
    name: 'BIS Eastern Regional Laboratory',
    city: 'Kolkata',
    state: 'West Bengal',
    address: '1/14 C.I.T. Scheme VII M, V.I.P. Road, Kolkata - 700054',
    categories: ['Steel', 'Gold', 'Mechanical'],
    phone: '033-23553243',
    email: 'erl@bis.gov.in',
    accreditation: 'Government Test House'
  }
];

export default function LabLocator({ initialProduct = '', initialCity = '' }) {
  const [labs, setLabs] = useState(RECOGNISED_LABS);
  const [selectedCity, setSelectedCity] = useState(initialCity || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialProduct);

  useEffect(() => {
    setSelectedCity(initialCity || 'ALL');
    setSearchQuery(initialProduct);
  }, [initialCity, initialProduct]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (initialProduct) params.set('product', initialProduct);
    if (initialCity) params.set('city', initialCity);
    fetch(apiUrl(`/labs/near${params.toString() ? `?${params}` : ''}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.labs && data.labs.length > 0) {
          // Merge API labs with rich catalogue
          const apiLabs = data.labs.map((l) => ({
            id: l.lab_id,
            name: l.name,
            city: l.city,
            state: l.state,
            address: `${l.city}, ${l.state}`,
            categories: (l.categories || '').split(',').map((c) => c.trim()),
            phone: '1800-11-4000',
            email: 'labs@bis.gov.in',
            accreditation: 'BIS Recognized Laboratory'
          }));
          setLabs(apiLabs);
        }
      })
      .catch(() => console.log('Using robust lab directory'));
  }, [initialCity, initialProduct]);

  const filteredLabs = labs.filter((lab) => {
    const matchesCity = selectedCity === 'ALL' || lab.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesCategory =
      selectedCategory === 'ALL' ||
      lab.categories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesSearch =
      lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.categories.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesCategory && matchesSearch;
  });

  return (
    <div className="container section-rhythm" style={{ paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
        <div>
          <span className="caption" style={{ color: '#0a2e0e', fontWeight: 600 }}>ACCREDITED TESTING INFRASTRUCTURE</span>
          <h2 className="display-md" style={{ marginTop: '4px', marginBottom: '8px' }}>
            Recognised BIS Testing Laboratories
          </h2>
          <p className="body-md" style={{ color: 'var(--color-muted)' }}>
            Find accredited public and private test houses across India authorized to generate valid test reports for BIS certification.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by lab or test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-input"
              style={{ paddingLeft: '30px', background: '#f8fafc', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '13px', width: '200px' }}
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dddddd', background: '#f8fafc', fontSize: '13px', color: '#181d26' }}
          >
            <option value="ALL">All Regions (India)</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolkata">Kolkata</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dddddd', background: '#f8fafc', fontSize: '13px', color: '#181d26' }}
          >
            <option value="ALL">All Categories</option>
            <option value="Electronics">Electronics & IT</option>
            <option value="Toys">Toys & Plastics</option>
            <option value="Gold">Gold Hallmarking</option>
            <option value="Lighting">Lighting & LED</option>
          </select>
        </div>
      </div>

      {/* Laboratory Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredLabs.map((lab, i) => (
          <div
            key={i}
            className="editorial-chat-box"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                  {lab.accreditation}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lab.city}</span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#181d26', marginBottom: '6px' }}>
                {lab.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                <MapPin size={14} color="#2563eb" />
                {lab.address}
              </div>

              {/* Scope badges */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                  TESTING SCOPE:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {lab.categories.map((c, idx) => (
                    <span
                      key={idx}
                      style={{ fontSize: '12px', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px' }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#64748b' }}>
              <span>📞 {lab.phone}</span>
              <a
                href="https://bis.gov.in"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Lab Portal
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
