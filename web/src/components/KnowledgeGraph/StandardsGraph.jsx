import React, { useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Share2, Search, Filter, ExternalLink, Info, CheckCircle2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ICS_CATEGORIES = [
  { code: 'ALL', label: 'All Clusters (23,573 Standards)' },
  { code: '29', label: 'Electrical & Lighting (ICS 29)' },
  { code: '97', label: 'Domestic Equipment & Toys (ICS 97)' },
  { code: '39', label: 'Jewellery & Precious Metals (ICS 39)' },
  { code: '33', label: 'Telecommunications & Electronics (ICS 33)' },
  { code: '91', label: 'Construction Materials & Cement (ICS 91)' },
  { code: '67', label: 'Food Technology & Packaging (ICS 67)' },
  { code: '03', label: 'Services & General Testing (ICS 03)' }
];

const NODE_COLORS = {
  standard: '#2563eb',   // Blue
  product: '#16a34a',    // Green
  lab: '#d97706',        // Amber / Orange
  ics: '#9333ea',        // Purple
  qco: '#dc2626',        // Red
  scheme: '#0d9488',     // Teal
  highlight: '#e11d48'   // Rose
};

const DEFAULT_GRAPH_DATA = {
  nodes: [
    { id: 'IS 16102 (Part 1)', label: 'Self-Ballasted LED Lamps (Safety)', type: 'standard', group: '29', scheme: 'CRS', status: 'ACTIVE', mandatory: true },
    { id: 'IS 16102 (Part 2)', label: 'Self-Ballasted LED Lamps (Performance)', type: 'standard', group: '29', scheme: 'CRS', status: 'ACTIVE', mandatory: true },
    { id: 'IS 15885 (Part 2/Sec 13)', label: 'Lamp Controlgear for LED', type: 'standard', group: '29', scheme: 'CRS', status: 'ACTIVE', mandatory: true },
    { id: 'IS 9873 (Part 1)', label: 'Safety of Toys (Mechanical)', type: 'standard', group: '97', scheme: 'ISI', status: 'ACTIVE', mandatory: true },
    { id: 'IS 9873 (Part 2)', label: 'Safety of Toys (Flammability)', type: 'standard', group: '97', scheme: 'ISI', status: 'ACTIVE', mandatory: true },
    { id: 'IS 1417', label: 'Gold & Gold Alloys Fineness & Hallmarking', type: 'standard', group: '39', scheme: 'HALLMARKING', status: 'ACTIVE', mandatory: true },
    { id: 'IS 694', label: 'PVC Insulated Cables', type: 'standard', group: '29', scheme: 'ISI', status: 'ACTIVE', mandatory: true },
    { id: 'IS 269', label: 'Ordinary Portland Cement', type: 'standard', group: '91', scheme: 'ISI', status: 'ACTIVE', mandatory: true },
    { id: 'lab:8139626', label: 'Conformity Testing Labs Pvt. Ltd. Unit 2', type: 'lab', group: 'lab', city: 'Delhi', state: 'Delhi' },
    { id: 'lab:8131406', label: 'DELHI TEST HOUSE', type: 'lab', group: 'lab', city: 'Delhi', state: 'Delhi' },
    { id: 'prod:LED bulb', label: '9W LED Bulb', type: 'product', group: 'product' },
    { id: 'prod:Children plastic toy', label: "Children's Plastic Toy", type: 'product', group: 'product' },
    { id: 'prod:Gold ring', label: '22K Gold Ring', type: 'product', group: 'product' },
    { id: 'ics:29', label: 'Electrical engineering', type: 'ics', group: '29' },
    { id: 'ics:97', label: 'Domestic and commercial equipment. Entertainment', type: 'ics', group: '97' },
    { id: 'ics:39', label: 'Precision mechanics. Jewellery', type: 'ics', group: '39' }
  ],
  links: [
    { source: 'prod:LED bulb', target: 'IS 16102 (Part 1)', rel: 'requires' },
    { source: 'lab:8139626', target: 'IS 16102 (Part 1)', rel: 'tests' },
    { source: 'IS 16102 (Part 1)', target: 'ics:29', rel: 'classified_as' },
    { source: 'IS 16102 (Part 2)', target: 'ics:29', rel: 'classified_as' },
    { source: 'prod:Children plastic toy', target: 'IS 9873 (Part 1)', rel: 'requires' },
    { source: 'lab:8131406', target: 'IS 9873 (Part 1)', rel: 'tests' },
    { source: 'IS 9873 (Part 1)', target: 'ics:97', rel: 'classified_as' },
    { source: 'prod:Gold ring', target: 'IS 1417', rel: 'requires' },
    { source: 'IS 1417', target: 'ics:39', rel: 'classified_as' }
  ]
};

export default function StandardsGraph({ focusedStandard, onSelectStandard }) {
  const [graphData, setGraphData] = useState(DEFAULT_GRAPH_DATA);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(DEFAULT_GRAPH_DATA.nodes[0]);
  const [dimensions, setDimensions] = useState({ width: 700, height: 500 });
  const [isFullGraph, setIsFullGraph] = useState(false);
  const [graphStats, setGraphStats] = useState({ total_graph_nodes: 26835, total_graph_edges: 8611, rendered_nodes: 4470, rendered_edges: 8611 });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  // Resize observer for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 700,
          height: clientHeight || 500
        });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch graph from backend API
  useEffect(() => {
    setLoading(true);
    let url = 'http://localhost:8000/graph';
    if (focusedStandard) {
      url += `?highlight=${encodeURIComponent(focusedStandard)}`;
    } else if (isFullGraph) {
      url += `?full=true`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          const nodes = data.nodes.map((n) => ({
            id: n.id,
            label: n.label || n.title || n.id,
            type: n.type || (n.id.startsWith('std:') ? 'standard' : n.id.startsWith('lab:') ? 'lab' : n.id.startsWith('prod:') ? 'product' : n.id.startsWith('ics:') ? 'ics' : 'standard'),
            group: n.group || '0',
            scheme: n.scheme || (n.id.startsWith('std:') ? 'CRS/ISI' : ''),
            status: n.status || 'ACTIVE',
            city: n.city || '',
            state: n.state || '',
            purchase_url: n.purchase_url || ''
          }));
          const links = (data.links || []).map((l) => ({
            source: l.source,
            target: l.target,
            rel: l.rel || 'links_to'
          }));
          setGraphData({ nodes, links });
          if (data.stats) setGraphStats(data.stats);

          if (focusedStandard) {
            const match = nodes.find((n) => n.id === focusedStandard || n.id === `std:${focusedStandard}`);
            if (match) setSelectedNode(match);
          }
        }
      })
      .catch(() => console.log('Using default knowledge graph preview'))
      .finally(() => setLoading(false));
  }, [focusedStandard, isFullGraph]);

  // Filter nodes and links based on selected ICS sector & search query
  const filteredData = useMemo(() => {
    const activeNodeIds = new Set();
    const query = searchQuery.trim().toLowerCase();

    const nodes = graphData.nodes.filter((n) => {
      const matchesGroup = selectedGroup === 'ALL' || n.group === selectedGroup || n.type === 'product' || n.type === 'lab';
      const matchesSearch =
        !query ||
        n.id.toLowerCase().includes(query) ||
        (n.label && n.label.toLowerCase().includes(query)) ||
        (n.city && n.city.toLowerCase().includes(query));

      const keep = matchesGroup && matchesSearch;
      if (keep) activeNodeIds.add(n.id);
      return keep;
    });

    const links = graphData.links.filter((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData, selectedGroup, searchQuery]);

  // Center node on click
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (onSelectStandard) onSelectStandard(node.id.replace('std:', ''));
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  };

  const handleZoomIn = () => fgRef.current && fgRef.current.zoom(fgRef.current.zoom() * 1.3, 400);
  const handleZoomOut = () => fgRef.current && fgRef.current.zoom(fgRef.current.zoom() / 1.3, 400);
  const handleResetZoom = () => fgRef.current && fgRef.current.zoomToFit(400, 30);

  return (
    <div className="editorial-chat-box" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div>
          <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Share2 size={20} color="#181d26" />
            Interactive BIS Knowledge Graph
          </h2>
          <p className="caption" style={{ marginTop: '4px' }}>
            Powered by <strong>react-force-graph</strong>: explore 26,800+ interconnected Standards, Testing Labs, Products & QCO Orders.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search graph (IS, Lab, Product)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-input"
              style={{ paddingLeft: '30px', background: '#f8fafc', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '13px', width: '230px', height: '32px' }}
            />
          </div>

          <button
            onClick={() => setIsFullGraph(!isFullGraph)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: isFullGraph ? '#1e293b' : '#ffffff',
              color: isFullGraph ? '#ffffff' : '#0f172a',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isFullGraph ? 'Showing All 26.8k Nodes' : 'Show Connected 4.4k Cluster'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '11.5px', color: '#64748b' }}>
        <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontWeight: 600 }}>
          {graphStats.rendered_nodes?.toLocaleString()} Active Nodes
        </span>
        <span>•</span>
        <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontWeight: 600 }}>
          {graphStats.rendered_edges?.toLocaleString()} Connected Relationships
        </span>
        {loading && <span style={{ color: '#2563eb', fontWeight: 500 }}>Refreshing graph...</span>}
      </div>

      {/* Main Visualizer & Info Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Canvas Area with react-force-graph */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            background: '#0a0f1d',
            borderRadius: '10px',
            overflow: 'hidden',
            height: '760px',
            border: '1px solid #334155',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
          }}
        >
          {/* Zoom & View Controls Overlay */}
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={handleZoomIn} title="Zoom In" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomIn size={17} />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={17} />
            </button>
            <button onClick={handleResetZoom} title="Reset View" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={17} />
            </button>
          </div>

          {/* Legend Overlay */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.standard }}></span> Standard</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.product }}></span> Product</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.lab }}></span> Lab</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS.ics }}></span> ICS Sector</span>
          </div>

          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={filteredData}
            nodeLabel={(n) => `${n.id}: ${n.label || ''}`}
            nodeColor={(n) => NODE_COLORS[n.type] || '#94a3b8'}
            nodeRelSize={5}
            nodeVal={(n) => (n.type === 'ics' ? 12 : n.type === 'standard' ? 8 : 6)}
            linkColor={() => '#475569'}
            linkWidth={1.5}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.15}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
          />
        </div>

        {/* Selected Entity Inspector Panel */}
        {selectedNode ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '760px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Info size={13} color={NODE_COLORS[selectedNode.type] || '#64748b'} />
                {selectedNode.type?.toUpperCase() || 'ENTITY'} DETAILS
              </div>

              <h3 style={{ fontSize: '17px', color: '#0f172a', marginTop: '8px', marginBottom: '8px', fontWeight: 700, lineHeight: 1.3 }}>
                {selectedNode.id}
              </h3>

              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
                {selectedNode.label || selectedNode.title || 'No description available.'}
              </p>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                {selectedNode.city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Location:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedNode.city}, {selectedNode.state}</strong>
                  </div>
                )}
                {selectedNode.scheme && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Scheme:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedNode.scheme}</strong>
                  </div>
                )}
                {selectedNode.group && selectedNode.group !== 'lab' && selectedNode.group !== 'product' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>ICS Code:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>ICS {selectedNode.group}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>● {selectedNode.status || 'ACTIVE'}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '14px' }}>
              <a
                href={selectedNode.purchase_url || 'https://standardsbis.in'}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ width: '100%', padding: '9px', fontSize: '12.5px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', textDecoration: 'none' }}
              >
                View on BIS Portal
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
            Click any node on the graph to inspect its details.
          </div>
        )}
      </div>
    </div>
  );
}
