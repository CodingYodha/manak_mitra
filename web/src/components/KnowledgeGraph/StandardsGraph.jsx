import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { Share2, Search, ExternalLink, Info, CheckCircle2, ZoomIn, ZoomOut, RotateCcw, Link2, MapPin, Layers, Sparkles, Network, Box, Grid } from 'lucide-react';

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
  const [dimensions, setDimensions] = useState({ width: 700, height: 760 });
  const [isFullGraph, setIsFullGraph] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true); // 3D mode by default to prevent overlap
  const [graphStats, setGraphStats] = useState({ total_graph_nodes: 26835, total_graph_edges: 8611, rendered_nodes: 4470, rendered_edges: 8611 });
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
          width: clientWidth || 700,
          height: clientHeight || 760
        });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
          source_url: n.source_url || ''
        }));
        const links = (data.links || []).map((l) => ({
          source: l.source,
          target: l.target,
          rel: l.rel || 'links_to'
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
            selectNode(match, { nodes, links });
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
                connectedIds.add(l.source);
                connectedIds.add(l.target);
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

  // Select node and highlight its connected 1-hop subgraph in 3D / 2D
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
      if (is3DMode && fgRef.current.cameraPosition) {
        const distance = 90;
        const hyp = Math.hypot(node.x, node.y, node.z || 0) || 1;
        const distRatio = 1 + distance / hyp;
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: (node.z || 0) * distRatio + 40 },
          node,
          1000
        );
      } else if (fgRef.current.centerAt) {
        fgRef.current.centerAt(node.x, node.y, 600);
        fgRef.current.zoom(2.0, 600);
      }
    }
  }, [graphData, onSelectStandard, is3DMode]);

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

      if (is3DMode && fgRef.current.cameraPosition) {
        fgRef.current.cameraPosition(
          { x: midX + 60, y: midY + 60, z: midZ + 80 },
          { x: midX, y: midY, z: midZ },
          1000
        );
      } else if (fgRef.current.centerAt) {
        fgRef.current.centerAt(midX, midY, 600);
        fgRef.current.zoom(2.2, 600);
      }
    }
  }, [graphData, is3DMode]);

  // Reset to full graph view
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSelectedGroup('ALL');
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightNodeIds(new Set());
    setHighlightLinkIds(new Set());

    if (fgRef.current) {
      if (is3DMode && fgRef.current.cameraPosition) {
        fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
      } else if (fgRef.current.zoomToFit) {
        fgRef.current.centerAt(0, 0, 700);
        fgRef.current.zoomToFit(700, 40);
      }
    }
  }, [is3DMode]);

  const handleZoomIn = () => {
    if (is3DMode && fgRef.current) {
      const currentPos = fgRef.current.camera().position;
      fgRef.current.cameraPosition({ x: currentPos.x * 0.75, y: currentPos.y * 0.75, z: currentPos.z * 0.75 }, undefined, 400);
    } else if (fgRef.current && fgRef.current.zoom) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (is3DMode && fgRef.current) {
      const currentPos = fgRef.current.camera().position;
      fgRef.current.cameraPosition({ x: currentPos.x * 1.35, y: currentPos.y * 1.35, z: currentPos.z * 1.35 }, undefined, 400);
    } else if (fgRef.current && fgRef.current.zoom) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.3, 300);
    }
  };

  return (
    <div className="editorial-chat-box" style={{ padding: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <h2 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Share2 size={20} color="#181d26" />
            3D Interactive BIS Knowledge Graph Universe
          </h2>
          <p className="caption" style={{ marginTop: '4px' }}>
            3D Spatial Visualization: Rotate in 360°, pan, and zoom without node overlap. Click any sphere to explore details.
          </p>
        </div>

        {/* Filter & Mode Controls */}
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

          {/* 3D / 2D Toggle Button */}
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid #3b82f6',
              background: is3DMode ? '#1e40af' : '#ffffff',
              color: is3DMode ? '#ffffff' : '#1e40af',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {is3DMode ? <Box size={14} /> : <Grid size={14} />}
            {is3DMode ? '3D Universe' : '2D Map'}
          </button>

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
            {isFullGraph ? 'Full 26.8k' : 'Connected 4.4k'}
          </button>
        </div>
      </div>

      {/* Stats and Reset Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ padding: '3px 9px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontWeight: 600 }}>
            {graphStats.rendered_nodes?.toLocaleString()} Active Spheres
          </span>
          <span>•</span>
          <span style={{ padding: '3px 9px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontWeight: 600 }}>
            {graphStats.rendered_edges?.toLocaleString()} 3D Connections
          </span>
          {highlightNodeIds.size > 0 && (
            <span style={{ padding: '3px 9px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>
              Focus: {highlightNodeIds.size} Highlighted Nodes
            </span>
          )}
          {loading && <span style={{ color: '#2563eb', fontWeight: 500 }}>Rendering 3D graph...</span>}
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

      {/* Main Visualizer & Info Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Canvas Area with ForceGraph3D / ForceGraph2D */}
        <div
          ref={containerRef}
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
            {is3DMode ? 'Left Drag: Rotate 360° • Right Drag: Pan • Scroll: Zoom' : 'Drag: Pan • Scroll: Zoom'}
          </div>

          {filteredData.nodes.length > 0 && (
            is3DMode ? (
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
                    return 'rgba(30, 41, 59, 0.2)'; // Dim non-selected nodes
                  }
                  return NODE_COLORS[n.type] || '#94a3b8';
                }}
                nodeRelSize={5}
                nodeVal={(n) => {
                  const isSelected = selectedNode && selectedNode.id === n.id;
                  if (isSelected) return 14;
                  if (highlightNodeIds.has(n.id)) return 9;
                  return n.type === 'ics' ? 7 : n.type === 'standard' ? 5 : 4;
                }}
                nodeResolution={16}
                linkColor={(l) => {
                  const lId = getLinkId(l);
                  if (highlightLinkIds.has(lId)) return '#60a5fa'; // Bright glowing blue
                  if (highlightLinkIds.size > 0) return 'rgba(30, 41, 59, 0.1)';
                  return 'rgba(71, 85, 105, 0.6)';
                }}
                linkWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 2.5 : 0.8)}
                linkDirectionalParticles={(l) => (highlightLinkIds.has(getLinkId(l)) ? 3 : 0)}
                linkDirectionalParticleSpeed={0.007}
                linkDirectionalParticleWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 2.5 : 1)}
                linkCurvature={0.08}
                onNodeClick={selectNode}
                onLinkClick={selectLink}
                backgroundColor="#070b14"
                showNavInfo={false}
                warmupTicks={60}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
              />
            ) : (
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={filteredData}
                nodeLabel={(n) => `${n.id}: ${n.label || ''}`}
                nodeColor={(n) => {
                  const isSelected = selectedNode && selectedNode.id === n.id;
                  if (isSelected) return '#ffffff';
                  if (highlightNodeIds.size > 0 && !highlightNodeIds.has(n.id)) {
                    return '#1e293b';
                  }
                  return NODE_COLORS[n.type] || '#94a3b8';
                }}
                nodeRelSize={5}
                nodeVal={(n) => {
                  const isSelected = selectedNode && selectedNode.id === n.id;
                  if (isSelected) return 18;
                  if (highlightNodeIds.has(n.id)) return 12;
                  return n.type === 'ics' ? 10 : n.type === 'standard' ? 7 : 5;
                }}
                linkColor={(l) => {
                  const lId = getLinkId(l);
                  if (highlightLinkIds.has(lId)) return '#60a5fa';
                  if (highlightLinkIds.size > 0) return 'rgba(30, 41, 59, 0.12)';
                  return '#334155';
                }}
                linkWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 2.5 : 1.2)}
                linkDirectionalArrowLength={(l) => (highlightLinkIds.has(getLinkId(l)) ? 4.5 : 3.0)}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.12}
                linkDirectionalParticles={(l) => (highlightLinkIds.has(getLinkId(l)) ? 3 : 0)}
                linkDirectionalParticleSpeed={0.006}
                linkDirectionalParticleWidth={(l) => (highlightLinkIds.has(getLinkId(l)) ? 3 : 1)}
                onNodeClick={selectNode}
                onLinkClick={selectLink}
                warmupTicks={100}
                cooldownTicks={120}
                d3VelocityDecay={0.35}
                d3AlphaDecay={0.03}
                enableNodeDrag={true}
              />
            )
          )}
        </div>

        {/* Selected Entity / Link Inspector Panel */}
        {selectedNode ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '760px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div>
              {/* Header Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: NODE_COLORS[selectedNode.type] || '#64748b', fontWeight: 800, letterSpacing: '0.05em' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: NODE_COLORS[selectedNode.type] || '#64748b' }}></span>
                  {selectedNode.type?.toUpperCase() || 'ENTITY'} DETAILS
                </div>
                {selectedLink && (
                  <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Active Link: {selectedLink.rel}
                  </span>
                )}
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
                        onClick={() => {
                          selectLink(nb.link);
                          selectNode(nb.node);
                        }}
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
          /* Default Overview Panel when no specific node is selected */
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '760px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#2563eb', fontWeight: 800, letterSpacing: '0.05em' }}>
                <Network size={14} color="#2563eb" />
                3D GRAPH UNIVERSE OVERVIEW
              </div>

              <h3 style={{ fontSize: '18px', color: '#0f172a', marginTop: '10px', marginBottom: '8px', fontWeight: 700, lineHeight: 1.3 }}>
                BIS Standards & Lab Knowledge Graph
              </h3>

              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '18px' }}>
                Spheres are distributed across 3D space. Rotate with mouse drag in 360° to explore without overlapping.
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
                Explore Entire 3D Network
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
