import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cosmograph, CosmographProvider } from '@cosmograph/react';
import { Share2, Search, ExternalLink, Info, CheckCircle2, ZoomIn, ZoomOut, RotateCcw, Link2, MapPin, Layers, Sparkles, Network, Cpu } from 'lucide-react';

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
  standard: '#3b82f6',   // Vibrant Blue
  product: '#10b981',    // Emerald Green
  lab: '#f59e0b',        // Amber Gold
  ics: '#a855f7',        // Purple
  qco: '#f43f5e',        // Rose Red
  scheme: '#14b8a6',     // Teal
  highlight: '#ffffff'
};

export default function StandardsGraph({ focusedStandard, onSelectStandard }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullGraph, setIsFullGraph] = useState(false);
  const [graphStats, setGraphStats] = useState({ total_graph_nodes: 26835, total_graph_edges: 8611, rendered_nodes: 4470, rendered_edges: 8611 });
  const [loading, setLoading] = useState(true);

  const cosmographRef = useRef(null);

  // Fetch graph from backend API with automatic static fallback
  useEffect(() => {
    setLoading(true);
    let url = 'http://localhost:8000/graph';
    if (focusedStandard) {
      url += `?highlight=${encodeURIComponent(focusedStandard)}`;
    } else if (isFullGraph) {
      url += `?full=true`;
    }

    const processData = (data) => {
      if (data.nodes && data.nodes.length > 0) {
        const nodes = data.nodes.map((n) => {
          const type = n.type || (n.id.startsWith('std:') ? 'standard' : n.id.startsWith('lab:') ? 'lab' : n.id.startsWith('prod:') ? 'product' : n.id.startsWith('ics:') ? 'ics' : n.id.startsWith('qco:') ? 'qco' : 'standard');
          return {
            id: n.id,
            label: n.label || n.title || n.id,
            type,
            color: NODE_COLORS[type] || '#94a3b8',
            size: type === 'ics' ? 14 : type === 'standard' ? 9 : 7,
            group: n.group || '0',
            scheme: n.scheme || (n.id.startsWith('std:') ? 'CRS/ISI' : ''),
            status: n.status || 'ACTIVE',
            city: n.city || '',
            state: n.state || '',
            purchase_url: n.purchase_url || '',
            notification_url: n.notification_url || '',
            source_url: n.source_url || ''
          };
        });

        const links = (data.links || []).map((l) => ({
          source: typeof l.source === 'object' ? l.source.id : l.source,
          target: typeof l.target === 'object' ? l.target.id : l.target,
          rel: l.rel || 'links_to',
          color: 'rgba(71, 85, 105, 0.45)'
        }));

        setGraphData({ nodes, links });
        if (data.stats) {
          setGraphStats(data.stats);
        } else {
          setGraphStats({
            total_graph_nodes: 26835,
            total_graph_edges: 8611,
            rendered_nodes: nodes.length,
            rendered_edges: links.length
          });
        }

        // Focus matching standard if requested
        if (focusedStandard) {
          const match = nodes.find((n) => n.id === focusedStandard || n.id === `std:${focusedStandard}`);
          if (match) {
            setSelectedNode(match);
            setTimeout(() => {
              cosmographRef.current?.selectNode(match);
              cosmographRef.current?.zoomToNode(match, 800);
            }, 500);
          }
        }
      }
    };

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Backend HTTP error');
        return res.json();
      })
      .then(processData)
      .catch(() => {
        return fetch('/graph.json')
          .then((res) => res.json())
          .then((staticData) => {
            if (!isFullGraph) {
              const connectedIds = new Set();
              (staticData.links || []).forEach(l => {
                connectedIds.add(typeof l.source === 'object' ? l.source.id : l.source);
                connectedIds.add(typeof l.target === 'object' ? l.target.id : l.target);
              });
              const connectedNodes = (staticData.nodes || []).filter(n => connectedIds.has(n.id));
              processData({ nodes: connectedNodes, links: staticData.links });
            } else {
              processData(staticData);
            }
          })
          .catch((staticErr) => {
            console.error('Failed to load static graph fallback:', staticErr);
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [focusedStandard, isFullGraph]);

  // Filter nodes and links based on selected ICS sector & search query
  const filteredData = useMemo(() => {
    if (!graphData.nodes.length) return { nodes: [], links: [] };

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
      return activeNodeIds.has(l.source) && activeNodeIds.has(l.target);
    });

    return { nodes, links };
  }, [graphData, selectedGroup, searchQuery]);

  // Find connected neighbors for the currently selected node
  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNode || !graphData.links.length) return [];
    const neighbors = [];
    const nodeId = selectedNode.id;

    graphData.links.forEach((l) => {
      if (l.source === nodeId) {
        const targetNode = graphData.nodes.find((n) => n.id === l.target);
        if (targetNode) neighbors.push({ node: targetNode, rel: l.rel, direction: 'outgoing' });
      } else if (l.target === nodeId) {
        const sourceNode = graphData.nodes.find((n) => n.id === l.source);
        if (sourceNode) neighbors.push({ node: sourceNode, rel: l.rel, direction: 'incoming' });
      }
    });
    return neighbors;
  }, [selectedNode, graphData]);

  // Handle node selection in Cosmograph GPU WebGL canvas
  const handleNodeClick = useCallback((node) => {
    if (!node) {
      setSelectedNode(null);
      cosmographRef.current?.unselectNodes();
      return;
    }
    setSelectedNode(node);
    cosmographRef.current?.selectNode(node);
    cosmographRef.current?.zoomToNode(node, 600);

    if (onSelectStandard && (node.type === 'standard' || node.id.startsWith('std:'))) {
      onSelectStandard(node.id.replace('std:', ''));
    }
  }, [onSelectStandard]);

  // Reset to full graph view
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedGroup('ALL');
    setSelectedNode(null);
    cosmographRef.current?.unselectNodes();
    cosmographRef.current?.fitView(800);
  }, []);

  const handleZoomIn = () => cosmographRef.current?.zoom(1.4, 300);
  const handleZoomOut = () => cosmographRef.current?.zoom(0.7, 300);

  return (
    <div className="editorial-chat-box" style={{ padding: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Cpu size={20} color="#3b82f6" />
            Hardware-Accelerated WebGL Knowledge Graph
          </h2>
          <p className="caption" style={{ marginTop: '4px' }}>
            Powered by <strong>Cosmograph GPU WebGL2</strong>: zero-lag 60fps rendering of 26,800+ interconnected Standards, Testing Labs & Products.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search graph (IS, Lab, Product)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-input"
              style={{ paddingLeft: '30px', background: '#f8fafc', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '13px', width: '220px', height: '32px' }}
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{ height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #dddddd', background: '#f8fafc', fontSize: '12.5px', color: '#181d26' }}
          >
            {ICS_CATEGORIES.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>

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
            {isFullGraph ? 'Full 26.8k Catalogue' : 'Connected 4.4k Clusters'}
          </button>
        </div>
      </div>

      {/* Stats and Reset Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ padding: '3px 9px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontWeight: 600 }}>
            {graphStats.rendered_nodes?.toLocaleString()} GPU Nodes
          </span>
          <span>•</span>
          <span style={{ padding: '3px 9px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontWeight: 600 }}>
            {graphStats.rendered_edges?.toLocaleString()} WebGL Links
          </span>
          <span style={{ padding: '3px 9px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
            ⚡ 60 FPS GPU WebGL2
          </span>
          {loading && <span style={{ color: '#2563eb', fontWeight: 500 }}>Initializing GPU buffers...</span>}
        </div>

        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            padding: '5px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <RotateCcw size={13} />
          Reset View to Full Graph
        </button>
      </div>

      {/* Main Visualizer & Info Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Hardware-Accelerated Cosmograph WebGL Canvas */}
        <div
          style={{
            position: 'relative',
            background: '#070b14',
            borderRadius: '10px',
            overflow: 'hidden',
            height: '760px',
            border: '1px solid #334155',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
          }}
        >
          {/* Zoom Controls Overlay */}
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={handleZoomIn} title="Zoom In" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomIn size={17} />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={17} />
            </button>
            <button onClick={handleReset} title="Reset View" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={17} />
            </button>
          </div>

          {/* Legend Overlay */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: 'rgba(7, 11, 20, 0.90)', backdropFilter: 'blur(6px)', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLORS.standard }}></span> Standard</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLORS.product }}></span> Product</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLORS.lab }}></span> Lab</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLORS.ics }}></span> ICS Sector</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLORS.qco }}></span> QCO Order</span>
          </div>

          {filteredData.nodes.length > 0 && (
            <CosmographProvider>
              <Cosmograph
                ref={cosmographRef}
                nodes={filteredData.nodes}
                links={filteredData.links}
                nodeColor={(n) => n.color}
                nodeSize={(n) => (selectedNode && selectedNode.id === n.id ? n.size * 1.8 : n.size)}
                nodeLabelAccessor={(n) => `${n.id}: ${n.label || ''}`}
                linkColor={(l) => (selectedNode && (l.source === selectedNode.id || l.target === selectedNode.id) ? '#60a5fa' : 'rgba(71, 85, 105, 0.35)')}
                linkWidth={(l) => (selectedNode && (l.source === selectedNode.id || l.target === selectedNode.id) ? 2.5 : 0.8)}
                linkArrows={true}
                showDynamicLabels={true}
                backgroundColor="#070b14"
                simulationFriction={0.88}
                simulationRepulsion={1.6}
                simulationGravity={0.15}
                onClick={handleNodeClick}
                style={{ width: '100%', height: '100%' }}
              />
            </CosmographProvider>
          )}
        </div>

        {/* Selected Entity Inspector Panel */}
        {selectedNode ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '760px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div>
              {/* Header Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: NODE_COLORS[selectedNode.type] || '#64748b', fontWeight: 800, letterSpacing: '0.05em' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS[selectedNode.type] || '#64748b' }}></span>
                {selectedNode.type?.toUpperCase() || 'ENTITY'} DETAILS
              </div>

              {/* Entity Title */}
              <h3 style={{ fontSize: '18px', color: '#0f172a', marginTop: '10px', marginBottom: '8px', fontWeight: 700, lineHeight: 1.3 }}>
                {selectedNode.id}
              </h3>

              {/* Description */}
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
                {selectedNode.label || selectedNode.title || 'No description available.'}
              </p>

              {/* Specific Properties Table */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                {selectedNode.city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> Location:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedNode.city}, {selectedNode.state}</strong>
                  </div>
                )}
                {selectedNode.scheme && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Layers size={13} /> Certification Scheme:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedNode.scheme}</strong>
                  </div>
                )}
                {selectedNode.group && selectedNode.group !== 'lab' && selectedNode.group !== 'product' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={13} /> ICS Sector:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>ICS {selectedNode.group}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13} /> Regulatory Status:</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>● {selectedNode.status || 'ACTIVE'}</span>
                </div>
              </div>

              {/* Connected Relationships & Neighbors Section */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Link2 size={14} color="#2563eb" />
                  Connected Relationships ({selectedNodeNeighbors.length}):
                </div>

                {selectedNodeNeighbors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    {selectedNodeNeighbors.map((nb, i) => (
                      <div
                        key={i}
                        onClick={() => handleNodeClick(nb.node)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '2px' }}>
                          <span style={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                            {nb.rel}
                          </span>
                          <span style={{ color: NODE_COLORS[nb.node.type] || '#64748b', fontWeight: 700 }}>
                            {nb.node.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                          {nb.node.id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.node.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '11.5px', color: '#94a3b8' }}>No directly linked entities in active cluster filter.</p>
                )}
              </div>
            </div>

            {/* Direct Official Link */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '14px' }}>
              <a
                href={selectedNode.purchase_url || selectedNode.notification_url || selectedNode.source_url || 'https://standardsbis.in'}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ width: '100%', padding: '9px', fontSize: '12.5px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}
              >
                Inspect Official BIS Record
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : (
          /* Default Overview Panel */
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '760px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#2563eb', fontWeight: 800, letterSpacing: '0.05em' }}>
                <Network size={14} color="#2563eb" />
                GPU WEBGL GRAPH OVERVIEW
              </div>

              <h3 style={{ fontSize: '18px', color: '#0f172a', marginTop: '10px', marginBottom: '8px', fontWeight: 700, lineHeight: 1.3 }}>
                BIS Standards & Lab Knowledge Graph
              </h3>

              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '18px' }}>
                Powered by Cosmograph WebGL2 hardware acceleration. Click any node in the canvas to zoom in and inspect certification pathways.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>⚡ 3 Demo Products Seeded</div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>LED Lamps (IS 16102), Children's Toys (IS 9873), and Gold Jewellery (IS 1417) are mapped to 50+ certified testing facilities.</div>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: '4px' }}>🏢 338 Verified BIS Laboratories</div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>Testing facility capabilities across 95 major Indian cities with real-time Haversine proximity calculations.</div>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: '#7e22ce', marginBottom: '4px' }}>📚 ISO ICS 3-Tier Taxonomy</div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>1,382 international classification standards domains spanning Electrical, Mechanical, Food, and Jewellery sectors.</div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <button
                onClick={handleReset}
                style={{ width: '100%', padding: '10px', fontSize: '12.5px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                <Sparkles size={14} color="#60a5fa" />
                Fit Entire Network View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
