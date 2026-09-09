import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Share2, Search, ExternalLink, Info, CheckCircle2, ZoomIn, ZoomOut, RotateCcw, Link2, MapPin, Layers, Building2, PackageCheck, Sparkles, Box } from 'lucide-react';

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

const getLinkId = (link) => {
  const s = typeof link.source === 'object' ? link.source.id : link.source;
  const t = typeof link.target === 'object' ? link.target.id : link.target;
  return `${s}->${t}`;
};

export default function StandardsGraph({ focusedStandard, onSelectStandard }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 680 });
  const [graphStats, setGraphStats] = useState({ total_nodes: 26835, total_edges: 8611, rendered_nodes: 4470, rendered_edges: 8611 });
  const [loading, setLoading] = useState(true);

  // Highlighting sets of IDs
  const [highlightNodeIds, setHighlightNodeIds] = useState(new Set());
  const [highlightLinkIds, setHighlightLinkIds] = useState(new Set());

  const containerRef = useRef(null);
  const fgRef = useRef(null);

  // Resize observer for responsive canvas container
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 1200,
          height: clientHeight || 680
        });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Instant Load from Pre-computed 3D Fast Layout
  useEffect(() => {
    setLoading(true);

    fetch('/graph_3d.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          const nodes = data.nodes.map((n) => ({
            id: n.id,
            label: n.label || n.title || n.id,
            type: n.type || (n.id.startsWith('std:') ? 'standard' : n.id.startsWith('lab:') ? 'lab' : n.id.startsWith('prod:') ? 'product' : n.id.startsWith('ics:') ? 'ics' : n.id.startsWith('qco:') ? 'qco' : 'standard'),
            group: n.group || '0',
            scheme: n.scheme || (n.id.startsWith('std:') ? 'CRS/ISI' : ''),
            status: n.status || 'ACTIVE',
            city: n.city || '',
            state: n.state || '',
            purchase_url: n.purchase_url || '',
            notification_url: n.notification_url || '',
            source_url: n.source_url || '',
            // Pre-computed 3D positions for zero calculation lag
            x: n.x,
            y: n.y,
            z: n.z,
            fx: n.fx,
            fy: n.fy,
            fz: n.fz
          }));

          const links = (data.links || []).map((l) => ({
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target,
            rel: l.rel || 'links_to'
          }));

          setGraphData({ nodes, links });
          if (data.stats) setGraphStats(data.stats);

          if (focusedStandard) {
            const match = nodes.find((n) => n.id === focusedStandard || n.id === `std:${focusedStandard}`);
            if (match) {
              selectNode(match, { nodes, links });
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load 3D graph layout, trying fallback /graph_fast.json:', err);
        return fetch('/graph_fast.json')
          .then((res) => res.json())
          .then((data) => {
            if (data.nodes && data.nodes.length > 0) {
              const nodes = data.nodes.map((n) => ({
                id: n.id,
                label: n.label || n.title || n.id,
                type: n.type || (n.id.startsWith('std:') ? 'standard' : n.id.startsWith('lab:') ? 'lab' : n.id.startsWith('prod:') ? 'product' : n.id.startsWith('ics:') ? 'ics' : n.id.startsWith('qco:') ? 'qco' : 'standard'),
                group: n.group || '0',
                scheme: n.scheme || (n.id.startsWith('std:') ? 'CRS/ISI' : ''),
                status: n.status || 'ACTIVE',
                city: n.city || '',
                state: n.state || '',
                purchase_url: n.purchase_url || '',
                notification_url: n.notification_url || '',
                source_url: n.source_url || '',
                x: n.x,
                y: n.y,
                z: n.z || 0,
                fx: n.x,
                fy: n.y,
                fz: n.z || 0
              }));
              const links = (data.links || []).map((l) => ({
                source: typeof l.source === 'object' ? l.source.id : l.source,
                target: typeof l.target === 'object' ? l.target.id : l.target,
                rel: l.rel || 'links_to'
              }));
              setGraphData({ nodes, links });
            }
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [focusedStandard]);

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
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData, selectedGroup, searchQuery]);

  // Find connected neighbors for the currently selected node
  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNode || !graphData.links.length) return [];
    const neighbors = [];
    const nodeId = selectedNode.id;

    graphData.links.forEach((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;

      if (sourceId === nodeId) {
        const targetNode = graphData.nodes.find((n) => n.id === targetId);
        if (targetNode) neighbors.push({ node: targetNode, rel: l.rel, direction: 'outgoing', link: l });
      } else if (targetId === nodeId) {
        const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
        if (sourceNode) neighbors.push({ node: sourceNode, rel: l.rel, direction: 'incoming', link: l });
      }
    });
    return neighbors;
  }, [selectedNode, graphData]);

  // Select node and highlight its connected 1-hop subgraph in 3D
  const selectNode = useCallback((node, dataOverride = null) => {
    if (!node) return;
    const currentData = dataOverride || graphData;

    setSelectedNode(node);
    setSelectedLink(null);

    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    newHighlightNodes.add(node.id);

    currentData.links.forEach((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;

      if (sourceId === node.id || targetId === node.id) {
        newHighlightNodes.add(sourceId);
        newHighlightNodes.add(targetId);
        newHighlightLinks.add(getLinkId(l));
      }
    });

    setHighlightNodeIds(newHighlightNodes);
    setHighlightLinkIds(newHighlightLinks);

    if (onSelectStandard && (node.type === 'standard' || node.id.startsWith('std:'))) {
      onSelectStandard(node.id.replace('std:', ''));
    }

    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      const distance = 80;
      const hyp = Math.hypot(node.x, node.y, node.z || 0) || 1;
      const distRatio = 1 + distance / hyp;
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: (node.z || 0) * distRatio + 30 },
        node,
        800
      );
    }
  }, [graphData, onSelectStandard]);

  // Select relationship link and highlight its endpoints
  const selectLink = useCallback((link) => {
    if (!link) return;
    const sourceNode = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === link.source);
    const targetNode = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === link.target);

    setSelectedLink(link);
    if (sourceNode) setSelectedNode(sourceNode);

    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (sourceNode) newHighlightNodes.add(sourceNode.id);
    if (targetNode) newHighlightNodes.add(targetNode.id);
    newHighlightLinks.add(getLinkId(link));

    setHighlightNodeIds(newHighlightNodes);
    setHighlightLinkIds(newHighlightLinks);

    if (fgRef.current && sourceNode && targetNode && sourceNode.x !== undefined && targetNode.x !== undefined) {
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      const midZ = ((sourceNode.z || 0) + (targetNode.z || 0)) / 2;

      fgRef.current.cameraPosition(
        { x: midX + 50, y: midY + 50, z: midZ + 70 },
        { x: midX, y: midY, z: midZ },
        800
      );
    }
  }, [graphData]);

  // Reset to full 3D graph view
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedGroup('ALL');
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightNodeIds(new Set());
    setHighlightLinkIds(new Set());

    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 800);
    }
  }, []);

  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentPos = fgRef.current.camera().position;
      fgRef.current.cameraPosition({ x: currentPos.x * 0.75, y: currentPos.y * 0.75, z: currentPos.z * 0.75 }, undefined, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentPos = fgRef.current.camera().position;
      fgRef.current.cameraPosition({ x: currentPos.x * 1.35, y: currentPos.y * 1.35, z: currentPos.z * 1.35 }, undefined, 300);
    }
  };

  return (
    <div style={{ padding: '24px 32px 60px', width: '100%', boxSizing: 'border-box' }}>
      <div className="editorial-chat-box" style={{ padding: '24px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Box size={20} color="#3b82f6" />
              3D Interactive BIS Knowledge Graph Universe
            </h2>
            <p className="caption" style={{ marginTop: '4px' }}>
              Pure 3D Spatial Visualization (60 FPS): Left Drag to Rotate 360° • Right Drag to Pan • Click any sphere to focus.
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
                style={{ paddingLeft: '30px', background: '#f8fafc', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '13px', width: '230px', height: '32px' }}
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
          </div>
        </div>

        {/* Stats and Reset Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '3px 9px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontWeight: 600 }}>
              {graphStats.rendered_nodes?.toLocaleString()} Active 3D Spheres
            </span>
            <span>•</span>
            <span style={{ padding: '3px 9px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontWeight: 600 }}>
              {graphStats.rendered_edges?.toLocaleString()} Spatial Connections
            </span>
            <span style={{ padding: '3px 9px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
              ⚡ Silky Smooth 60 FPS
            </span>
            {highlightNodeIds.size > 0 && (
              <span style={{ padding: '3px 9px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
                Focus: {highlightNodeIds.size} Highlighted Entities
              </span>
            )}
            {loading && <span style={{ color: '#2563eb', fontWeight: 500 }}>Initializing 3D universe...</span>}
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
            Reset 3D Camera View
          </button>
        </div>

        {/* 1. Full-Width 3D Knowledge Graph Canvas (Expanded across the full section) */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            background: '#070b14',
            borderRadius: '10px',
            overflow: 'hidden',
            height: '680px',
            width: '100%',
            border: '1px solid #334155',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            marginBottom: '20px'
          }}
        >
          {/* Controls Overlay */}
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={handleZoomIn} title="Zoom In" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomIn size={17} />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ZoomOut size={17} />
            </button>
            <button onClick={handleReset} title="Reset to Full Universe" style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* 3D Navigation Hint */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10, background: 'rgba(7, 11, 20, 0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', fontSize: '10.5px', color: '#94a3b8' }}>
            Left Drag: Rotate 360° • Right Drag: Pan • Scroll: Zoom • Click: Focus
          </div>

          {filteredData.nodes.length > 0 && (
            <ForceGraph3D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={filteredData}
              nodeLabel={(n) => `${n.id}: ${n.label || ''}`}
              nodeColor={(n) => {
                const isSelected = selectedNode && selectedNode.id === n.id;
                if (isSelected) return '#ffffff';
                if (highlightNodeIds.size > 0 && !highlightNodeIds.has(n.id)) {
                  return 'rgba(30, 41, 59, 0.25)'; // Dim non-selected nodes
                }
                return NODE_COLORS[n.type] || '#94a3b8';
              }}
              nodeRelSize={4.5}
              nodeVal={(n) => {
                const isSelected = selectedNode && selectedNode.id === n.id;
                if (isSelected) return 15;
                if (highlightNodeIds.has(n.id)) return 10;
                return n.type === 'ics' ? 8 : n.type === 'standard' ? 5 : 4;
              }}
              nodeResolution={8}
              linkColor={(l) => {
                const lId = getLinkId(l);
                if (highlightLinkIds.has(lId)) return '#60a5fa'; // Bright glowing blue
                if (highlightLinkIds.size > 0) return 'rgba(30, 41, 59, 0.08)';
                return 'rgba(71, 85, 105, 0.4)';
              }}
              linkWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 2.5 : 0.6)}
              linkDirectionalParticles={(l) => (highlightLinkIds.has(getLinkId(l)) ? 3 : 0)}
              linkDirectionalParticleSpeed={0.007}
              linkDirectionalParticleWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 2.5 : 0)}
              linkCurvature={0}
              onNodeClick={selectNode}
              onLinkClick={selectLink}
              backgroundColor="#070b14"
              showNavInfo={false}
              warmupTicks={0}
              cooldownTicks={0}
              enableNodeDrag={false}
            />
          )}
        </div>

        {/* 2. Inspector / Overview Panel (Moved Below Graph) */}
        {selectedNode ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
          >
            {/* Top Header of the Inspector */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '18px',
                marginBottom: '20px'
              }}
            >
              <div style={{ flex: '1 1 500px', minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      color: NODE_COLORS[selectedNode.type] || '#64748b',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '4px 10px',
                      borderRadius: '20px'
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: NODE_COLORS[selectedNode.type] || '#64748b'
                      }}
                    />
                    {selectedNode.type?.toUpperCase() || 'ENTITY'} DETAILS
                  </div>

                  {selectedLink && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Link2 size={12} /> Active Connection: {selectedLink.rel}
                    </span>
                  )}

                  {selectedNode.scheme && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#f0fdf4',
                        color: '#166534',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        border: '1px solid #bbf7d0'
                      }}
                    >
                      {selectedNode.scheme} Scheme
                    </span>
                  )}
                </div>

                <h3
                  style={{
                    fontSize: '22px',
                    color: '#0f172a',
                    margin: '6px 0 8px 0',
                    fontWeight: 700,
                    lineHeight: 1.25
                  }}
                >
                  {selectedNode.id}
                </h3>

                <p
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: 1.55,
                    margin: 0,
                    maxWidth: '880px'
                  }}
                >
                  {selectedNode.label || selectedNode.title || 'No description available.'}
                </p>
              </div>

              <div>
                <a
                  href={selectedNode.purchase_url || selectedNode.notification_url || selectedNode.source_url || 'https://standardsbis.in'}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '13px',
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Inspect Official BIS Record
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Content Details: Regulatory Profile & Connected Relationships */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px'
              }}
            >
              {/* Left Column: Regulatory & Classification Attributes */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Info size={14} color="#64748b" />
                  Regulatory & Classification Profile
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  {selectedNode.scheme && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="#3b82f6" /> Certification Scheme:
                      </span>
                      <strong style={{ color: '#0f172a' }}>{selectedNode.scheme}</strong>
                    </div>
                  )}

                  {selectedNode.group && selectedNode.group !== 'lab' && selectedNode.group !== 'product' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={14} color="#a855f7" /> ICS Sector:
                      </span>
                      <strong style={{ color: '#0f172a' }}>ICS {selectedNode.group}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} color="#16a34a" /> Regulatory Status:
                    </span>
                    <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }}></span>
                      {selectedNode.status || 'ACTIVE'}
                    </span>
                  </div>

                  {selectedNode.city && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#f59e0b" /> Location:
                      </span>
                      <strong style={{ color: '#0f172a' }}>{selectedNode.city}, {selectedNode.state}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PackageCheck size={14} color="#64748b" /> Entity Type:
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>
                      {selectedNode.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Connected Relationships & Neighbors */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link2 size={15} color="#2563eb" />
                    Connected Relationships ({selectedNodeNeighbors.length}):
                  </div>
                  {selectedNodeNeighbors.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Click any entity to focus graph
                    </span>
                  )}
                </div>

                {selectedNodeNeighbors.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '10px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}
                  >
                    {selectedNodeNeighbors.map((nb, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          selectLink(nb.link);
                          selectNode(nb.node);
                        }}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb';
                          e.currentTarget.style.background = '#f0f7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#f8fafc';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', background: '#dbeafe', padding: '1px 6px', borderRadius: '3px' }}>
                            {nb.rel}
                          </span>
                          <span style={{ color: NODE_COLORS[nb.node.type] || '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                            {nb.node.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600, marginBottom: '2px' }}>
                          {nb.node.id}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nb.node.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    No directly linked entities in active cluster filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Default Overview Panel (Full-Width Horizontal Layout) */
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#2563eb', fontWeight: 800, letterSpacing: '0.05em' }}>
                  <Box size={14} color="#2563eb" />
                  3D GRAPH UNIVERSE OVERVIEW
                </div>
                <h3 style={{ fontSize: '20px', color: '#0f172a', marginTop: '6px', marginBottom: '4px', fontWeight: 700 }}>
                  BIS Standards &amp; Lab Knowledge Graph
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Pre-computed 3D spatial coordinates for smooth 60 FPS rotation and exploration with zero overlapping.
                </p>
              </div>

              <button
                onClick={handleReset}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Sparkles size={14} color="#60a5fa" />
                Explore Entire 3D Network
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '6px', fontSize: '13.5px' }}>⚡ 3 Demo Products Seeded</div>
                <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5 }}>
                  LED Lamps (IS 16102), Children's Toys (IS 9873), and Gold Jewellery (IS 1417) are mapped to 50+ certified testing facilities.
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: '6px', fontSize: '13.5px' }}>🏢 338 Verified BIS Laboratories</div>
                <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5 }}>
                  Testing facility capabilities across 95 major Indian cities with real-time Haversine proximity calculations.
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#7e22ce', marginBottom: '6px', fontSize: '13.5px' }}>📚 ISO ICS 3-Tier Taxonomy</div>
                <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5 }}>
                  1,382 international classification standards domains spanning Electrical, Mechanical, Food, and Jewellery sectors.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
