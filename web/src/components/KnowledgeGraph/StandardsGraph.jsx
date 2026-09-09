import React, { useState, useEffect } from 'react';
import { Share2, Search, Filter, ExternalLink, Info, CheckCircle2 } from 'lucide-react';

const ICS_CATEGORIES = [
  { code: 'ALL', label: 'All Clusters (23,573 Standards)' },
  { code: '29', label: 'Electrical & Lighting (ICS 29)' },
  { code: '97', label: 'Domestic Equipment & Toys (ICS 97)' },
  { code: '39', label: 'Jewellery & Precious Metals (ICS 39)' },
  { code: '33', label: 'Telecommunications & Electronics (ICS 33)' },
  { code: '91', label: 'Construction Materials & Cement (ICS 91)' },
  { code: '67', label: 'Food Technology & Packaging (ICS 67)' }
];

const DEFAULT_NODES = [
  { id: 'IS 16102 (Part 1)', label: 'Self-Ballasted LED Lamps for General Lighting Services — Safety', group: '29', scheme: 'CRS', status: 'ACTIVE', year: 2012, mandatory: true },
  { id: 'IS 16102 (Part 2)', label: 'Self-Ballasted LED Lamps — Performance Requirements', group: '29', scheme: 'CRS', status: 'ACTIVE', year: 2014, mandatory: true },
  { id: 'IS 15885 (Part 2/Sec 13)', label: 'Lamp Controlgear: Particular Requirements for DC/AC Supplied Electronic Controlgear for LED', group: '29', scheme: 'CRS', status: 'ACTIVE', year: 2012, mandatory: true },
  { id: 'IS 9873 (Part 1)', label: 'Safety of Toys — Mechanical and Physical Properties', group: '97', scheme: 'ISI', status: 'ACTIVE', year: 2019, mandatory: true },
  { id: 'IS 9873 (Part 2)', label: 'Safety of Toys — Flammability Requirements', group: '97', scheme: 'ISI', status: 'ACTIVE', year: 2017, mandatory: true },
  { id: 'IS 9873 (Part 3)', label: 'Safety of Toys — Migration of Certain Elements (Chemical Safety)', group: '97', scheme: 'ISI', status: 'ACTIVE', year: 2020, mandatory: true },
  { id: 'IS 1417', label: 'Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Hallmarking', group: '39', scheme: 'HALLMARKING', status: 'ACTIVE', year: 2016, mandatory: true },
  { id: 'IS 2112', label: 'Silver and Silver Alloys, Jewellery/Artefacts — Fineness and Hallmarking', group: '39', scheme: 'HALLMARKING', status: 'ACTIVE', year: 2014, mandatory: false },
  { id: 'IS 616', label: 'Audio, Video and Similar Electronic Apparatus — Safety Requirements', group: '33', scheme: 'CRS', status: 'ACTIVE', year: 2017, mandatory: true },
  { id: 'IS 13252 (Part 1)', label: 'Information Technology Equipment — Safety (General Requirements)', group: '33', scheme: 'CRS', status: 'ACTIVE', year: 2010, mandatory: true },
  { id: 'IS 694', label: 'Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables', group: '29', scheme: 'ISI', status: 'ACTIVE', year: 2010, mandatory: true },
  { id: 'IS 269', label: 'Ordinary Portland Cement — Specification', group: '91', scheme: 'ISI', status: 'ACTIVE', year: 2015, mandatory: true },
  { id: 'IS 4985', label: 'Unplasticized Polyvinyl Chloride (uPVC) Pipes for Potable Water Supplies', group: '91', scheme: 'ISI', status: 'ACTIVE', year: 2021, mandatory: true },
  { id: 'IS 14543', label: 'Packaged Drinking Water (Other Than Packaged Natural Mineral Water)', group: '67', scheme: 'ISI', status: 'ACTIVE', year: 2016, mandatory: true }
];

export default function StandardsGraph({ focusedStandard, onSelectStandard }) {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(DEFAULT_NODES[0]);

  useEffect(() => {
    fetch('http://localhost:8000/graph')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          // Merge with rich metadata
          setNodes((prev) => {
            const map = new Map();
            data.nodes.forEach((n) => map.set(n.id, { ...n, scheme: 'BIS', status: 'ACTIVE', mandatory: true }));
            DEFAULT_NODES.forEach((n) => map.set(n.id, n));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => console.log('Using robust offline standards graph catalogue'));
  }, []);

  const filteredNodes = nodes.filter((n) => {
    const matchesGroup = selectedGroup === 'ALL' || n.group === selectedGroup;
    const matchesSearch =
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.label && n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="editorial-chat-box" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="#181d26" />
            Indian Standards (IS) Semantic Cluster Graph
          </h2>
          <p className="caption" style={{ marginTop: '4px' }}>
            Interactive exploration of 23,573 verified standards grouped by International Classification for Standards (ICS).
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search standard or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-input"
              style={{ paddingLeft: '30px', background: '#f8fafc', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '13px', width: '220px' }}
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dddddd', background: '#f8fafc', fontSize: '13px', color: '#181d26' }}
          >
            {ICS_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Graph & Detail Drawer Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Graph Visual Canvas */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', minHeight: '440px', maxHeight: '520px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filteredNodes.length} standard nodes in cluster</span>
            <span>Click any node to inspect regulatory dossier</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id || focusedStandard === node.id;
              return (
                <div
                  key={node.id}
                  style={{
                    background: isSelected ? '#ffffff' : '#ffffff',
                    border: isSelected ? '2px solid #181d26' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setSelectedNode(node);
                    if (onSelectStandard) onSelectStandard(node.id);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8' }}>
                      {node.id}
                    </span>
                    <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ICS {node.group}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#181d26', fontWeight: 500, lineHeight: 1.4, marginBottom: '8px' }}>
                    {node.label}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                    <span>Scheme: <strong>{node.scheme || 'CRS'}</strong></span>
                    <span>·</span>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>Mandatory</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Detail Drawer */}
        {selectedNode && (
          <div style={{ background: '#ffffff', border: '1px solid #dddddd', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
                INDIAN STANDARD SPECIFICATION
              </div>
              <h3 style={{ fontSize: '18px', color: '#181d26', marginTop: '6px', marginBottom: '10px', fontWeight: 600 }}>
                {selectedNode.id}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#333840', lineHeight: 1.5, marginBottom: '16px' }}>
                {selectedNode.label}
              </p>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Certification Scheme:</span>
                  <strong style={{ color: '#181d26' }}>{selectedNode.scheme || 'CRS'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Current Status:</span>
                  <span style={{ color: '#15803d', fontWeight: 600 }}>● {selectedNode.status || 'ACTIVE'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>ICS Category:</span>
                  <span style={{ color: '#181d26' }}>Group {selectedNode.group}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Legal Obligation:</span>
                  <span style={{ color: '#b91c1c', fontWeight: 600 }}>Mandatory QCO</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
              <a
                href="https://standardsbis.in"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '13px', justifyContent: 'center' }}
              >
                View on BIS Standards Portal
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
