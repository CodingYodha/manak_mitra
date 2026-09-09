import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ─── Pre-baked graph data (25 nodes, ~30 edges) ─────────────────────── */
const NODES = [
  // Products
  { id: 'led',    type: 'product',  label: '9W LED Bulb',       x: -2.2,  y:  0.8, z: -0.5 },
  { id: 'toy',    type: 'product',  label: "Children's Toy",    x:  2.0,  y:  1.2, z:  0.4 },
  { id: 'gold',   type: 'product',  label: '22K Gold Ring',     x: -0.3,  y: -1.6, z:  0.9 },
  { id: 'cement', type: 'product',  label: 'Portland Cement',   x:  2.4,  y: -0.8, z: -0.6 },
  { id: 'steel',  type: 'product',  label: 'Steel Pipes',       x: -2.0,  y: -0.4, z:  1.4 },
  // Standards
  { id: 'is16102',type: 'standard', label: 'IS 16102',          x: -1.4,  y:  1.6, z:  0.2 },
  { id: 'is9873', type: 'standard', label: 'IS 9873 (Pt 1)',    x:  1.2,  y:  2.0, z: -0.3 },
  { id: 'is1417', type: 'standard', label: 'IS 1417',           x:  0.5,  y: -0.8, z:  1.6 },
  { id: 'is456',  type: 'standard', label: 'IS 456',            x:  2.8,  y: -1.6, z:  0.2 },
  { id: 'is1239', type: 'standard', label: 'IS 1239',           x: -2.6,  y:  0.0, z:  0.6 },
  { id: 'is4151', type: 'standard', label: 'IS 4151',           x:  0.8,  y:  1.0, z: -1.6 },
  // QCOs
  { id: 'qco_eit',type: 'qco',     label: 'Electronics QCO',   x: -0.8,  y:  2.4, z: -0.8 },
  { id: 'qco_toy',type: 'qco',     label: 'Toys QCO',          x:  2.6,  y:  2.0, z:  0.4 },
  { id: 'qco_hm', type: 'qco',     label: 'Hallmarking Order',  x:  0.2,  y: -2.0, z:  0.4 },
  { id: 'qco_cem',type: 'qco',     label: 'Cement QCO',        x:  3.0,  y: -0.4, z: -1.0 },
  // Schemes
  { id: 'crs',    type: 'scheme',   label: 'CRS Scheme',        x: -1.8,  y:  2.4, z:  0.6 },
  { id: 'isi',    type: 'scheme',   label: 'ISI Mark',          x:  1.8,  y:  2.8, z:  0.0 },
  { id: 'hmk',    type: 'scheme',   label: 'Hallmark (HUID)',   x: -0.4,  y: -2.6, z:  0.0 },
  // Labs
  { id: 'nth',    type: 'lab',     label: 'NTH New Delhi',     x: -2.4,  y:  1.6, z: -1.0 },
  { id: 'biswr',  type: 'lab',     label: 'BIS Western Lab',   x:  0.4,  y: -1.0, z: -1.8 },
  { id: 'cpri',   type: 'lab',     label: 'CPRI Bangalore',    x: -1.6,  y: -1.4, z: -0.8 },
  { id: 'nabl',   type: 'lab',     label: 'NABL Accred. Lab',  x:  2.2,  y:  0.2, z:  1.2 },
  // ICS clusters
  { id: 'ics29',  type: 'ics',     label: 'ICS 29 Electrical', x: -0.2,  y:  1.6, z:  1.4 },
  { id: 'ics97',  type: 'ics',     label: 'ICS 97 Domestic',   x:  0.8,  y:  2.8, z:  1.0 },
  { id: 'ics39',  type: 'ics',     label: 'ICS 39 Jewellery',  x: -0.8,  y: -2.4, z: -0.8 },
];

const EDGES = [
  { from: 'led',    to: 'is16102' }, { from: 'led',    to: 'qco_eit' }, { from: 'led', to: 'crs' },
  { from: 'is16102',to: 'qco_eit'}, { from: 'crs',    to: 'nth' },    { from: 'is16102', to: 'ics29' },
  { from: 'toy',    to: 'is9873' }, { from: 'toy',    to: 'qco_toy'}, { from: 'toy', to: 'isi' },
  { from: 'is9873', to: 'qco_toy'}, { from: 'isi',    to: 'nabl' },   { from: 'is9873', to: 'ics97' },
  { from: 'gold',   to: 'is1417' }, { from: 'gold',   to: 'qco_hm' }, { from: 'gold', to: 'hmk' },
  { from: 'is1417', to: 'qco_hm' }, { from: 'hmk',   to: 'biswr' },  { from: 'is1417', to: 'ics39' },
  { from: 'cement', to: 'is456' },  { from: 'cement', to: 'qco_cem'},
  { from: 'steel',  to: 'is1239'},  { from: 'steel',  to: 'cpri' },
  { from: 'led',    to: 'ics29' },  { from: 'ics29',  to: 'ics97' },
  { from: 'is4151', to: 'ics97' },  { from: 'cpri',   to: 'nth' },
];

const NODE_COLORS = {
  product:  0x10b981,
  standard: 0x3b82f6,
  qco:      0xf43f5e,
  scheme:   0x14b8a6,
  lab:      0xf59e0b,
  ics:      0xa855f7,
};
const TRAVERSE_COLOR   = 0xffd700;
const EDGE_BASE_COLOR  = 0x334155;
const EDGE_GLOW_COLOR  = 0xffd700;
const SCALE = 1.25;

/* ─── Traversal scenarios ─────────────────────────────────────────────── */
const SCENARIOS = [
  {
    query: 'Do I need BIS cert for 9W LED bulb?',
    path:  ['led', 'is16102', 'qco_eit', 'crs', 'nth'],
    answer: 'IS 16102 · CRS Registration Required',
  },
  {
    query: "Children's plastic toy mandatory standard?",
    path:  ['toy', 'is9873', 'qco_toy', 'isi', 'nabl'],
    answer: 'IS 9873 (Pt 1) · ISI Mark Scheme-I',
  },
  {
    query: 'Hallmarking rules for 22K gold ring?',
    path:  ['gold', 'is1417', 'qco_hm', 'hmk', 'biswr'],
    answer: 'IS 1417 · Mandatory HUID Hallmark',
  },
];

/* ─── Component ───────────────────────────────────────────────────────── */
export default function KGHeroAnimation() {
  const mountRef     = useRef(null);
  const [phase, setPhase] = useState('typing');      // typing | traversing | answered | resetting
  const [typedText, setTypedText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [traversalStep, setTraversalStep] = useState(-1);

  /* ── Three.js scene setup ─────────────────────────────────────────── */
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const W = container.clientWidth  || 540;
    const H = container.clientHeight || 440;

    // Scene
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(54, W / H, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Ambient + point lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pt = new THREE.PointLight(0x7dd3fc, 2, 20);
    pt.position.set(0, 4, 3);
    scene.add(pt);

    // Build node meshes
    const nodeMeshes = {};
    const nodePositions = {};
    NODES.forEach(n => {
      const pos = new THREE.Vector3(n.x * SCALE, n.y * SCALE, n.z * SCALE);
      nodePositions[n.id] = pos;
      const geo  = new THREE.SphereGeometry(0.13, 16, 16);
      const mat  = new THREE.MeshStandardMaterial({
        color:     NODE_COLORS[n.type] ?? 0xffffff,
        emissive:  NODE_COLORS[n.type] ?? 0xffffff,
        emissiveIntensity: 0.2,
        roughness: 0.4,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { id: n.id, baseColor: NODE_COLORS[n.type] ?? 0xffffff };
      scene.add(mesh);
      nodeMeshes[n.id] = mesh;
    });

    // Build edge lines
    const edgeMeshes = [];
    EDGES.forEach(e => {
      const from = nodePositions[e.from];
      const to   = nodePositions[e.to];
      if (!from || !to) return;
      const pts  = [from.clone(), to.clone()];
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);
      const mat  = new THREE.LineBasicMaterial({ color: EDGE_BASE_COLOR, transparent: true, opacity: 0.35 });
      const line = new THREE.Line(geo, mat);
      line.userData = { from: e.from, to: e.to };
      scene.add(line);
      edgeMeshes.push(line);
    });

    // Expose refs for animation controller
    container._scene      = scene;
    container._nodeMeshes = nodeMeshes;
    container._edgeMeshes = edgeMeshes;

    // Render loop
    let frameId;
    const rotGroup = new THREE.Group();
    // Move all into a rotation group
    Object.values(nodeMeshes).forEach(m => { scene.remove(m); rotGroup.add(m); });
    edgeMeshes.forEach(l => { scene.remove(l); rotGroup.add(l); });
    scene.add(rotGroup);

    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      rotGroup.rotation.y = t * 0.12;
      rotGroup.rotation.x = Math.sin(t * 0.08) * 0.12;
      // Pulse active nodes
      Object.values(nodeMeshes).forEach(m => {
        if (m.userData.traversed) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 5 + m.userData.phaseOffset);
          m.material.emissiveIntensity = 0.6 + pulse * 0.9;
          m.scale.setScalar(1 + pulse * 0.25);
        } else {
          m.material.emissiveIntensity = 0.2;
          m.scale.setScalar(1);
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    // Responsive Resize Observer
    const updateSize = (width, height) => {
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateSize(width, height);
      }
    });
    resizeObserver.observe(container);

    const onWindowResize = () => {
      updateSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      delete container._scene;
      delete container._nodeMeshes;
      delete container._edgeMeshes;
    };
  }, []); // run once

  /* ── Animation state machine ──────────────────────────────────────── */
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const t = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  const resetNodeColors = () => {
    const container = mountRef.current;
    if (!container?._nodeMeshes) return;
    Object.values(container._nodeMeshes).forEach(m => {
      m.material.color.setHex(m.userData.baseColor);
      m.material.emissive.setHex(m.userData.baseColor);
      m.material.emissiveIntensity = 0.2;
      m.userData.traversed = false;
      m.userData.phaseOffset = Math.random() * Math.PI * 2;
      m.scale.setScalar(1);
    });
    const edges = container._edgeMeshes || [];
    edges.forEach(l => {
      l.material.color.setHex(EDGE_BASE_COLOR);
      l.material.opacity = 0.35;
    });
  };

  const highlightEdge = (fromId, toId) => {
    const container = mountRef.current;
    if (!container?._edgeMeshes) return;
    container._edgeMeshes.forEach(l => {
      if (
        (l.userData.from === fromId && l.userData.to === toId) ||
        (l.userData.from === toId   && l.userData.to === fromId)
      ) {
        l.material.color.setHex(EDGE_GLOW_COLOR);
        l.material.opacity = 1;
      }
    });
  };

  const runScenario = (idx) => {
    clearTimers();
    const scenario = SCENARIOS[idx % SCENARIOS.length];
    setScenarioIdx(idx);

    // Reset state
    resetNodeColors();
    setTypedText('');
    setAnswerText('');
    setPhase('typing');
    setTraversalStep(-1);

    // Phase 1: Type query
    const query = scenario.query;
    let charIdx = 0;
    const typeNext = () => {
      if (charIdx <= query.length) {
        setTypedText(query.slice(0, charIdx));
        charIdx++;
        t(typeNext, 36 + Math.random() * 20);
      } else {
        // Phase 2: traversal
        t(() => {
          setPhase('traversing');
          traversePath(scenario, idx);
        }, 300);
      }
    };
    t(typeNext, 350);
  };

  const traversePath = (scenario, idx) => {
    const { path, answer } = scenario;
    const container = mountRef.current;

    path.forEach((nodeId, i) => {
      t(() => {
        setTraversalStep(i);
        if (!container?._nodeMeshes) return;
        const mesh = container._nodeMeshes[nodeId];
        if (mesh) {
          mesh.material.color.setHex(TRAVERSE_COLOR);
          mesh.material.emissive.setHex(TRAVERSE_COLOR);
          mesh.userData.traversed = true;
          mesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        }
        // Highlight edge to previous
        if (i > 0) highlightEdge(path[i - 1], nodeId);
      }, i * 650);
    });

    // Phase 3: show answer
    const totalTraverseMs = path.length * 650 + 200;
    t(() => {
      setPhase('answered');
      setAnswerText(answer);
    }, totalTraverseMs);

    // Phase 4: reset and next scenario
    t(() => {
      setPhase('resetting');
      const nextIdx = (idx + 1) % SCENARIOS.length;
      t(() => runScenario(nextIdx), 600);
    }, totalTraverseMs + 3200);
  };

  // Kick off on mount
  useEffect(() => {
    const startId = setTimeout(() => runScenario(0), 400);
    return () => {
      clearTimeout(startId);
      clearTimers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scenario = SCENARIOS[scenarioIdx % SCENARIOS.length];

  return (
    <div className="kg-hero-card-content">
      {/* 1. ASSISTANT QUERY PLATTER (Placed ABOVE the KG canvas) */}
      <div className="hero-assistant-platter">
        <div className="assistant-platter-header">
          <div className="assistant-platter-badge">
            <span className="kg-bubble-dot" />
            <span>Compliance Assistant</span>
          </div>
          <div className="assistant-platter-status">
            {phase === 'typing' && <span className="status-pill status-typing">Live Query Input</span>}
            {phase === 'traversing' && <span className="status-pill status-traversing">Traversing Graph...</span>}
            {phase === 'answered' && <span className="status-pill status-resolved">Grounded Citation</span>}
          </div>
        </div>

        <div className="assistant-platter-body">
          <div className="assistant-query-row">
            <span className="assistant-prompt-arrow">❯</span>
            <span className="assistant-query-text">
              {typedText}
              {phase === 'typing' && <span className="kg-cursor" />}
            </span>
          </div>

          {phase === 'answered' && answerText && (
            <div className="assistant-answer-row fade-in">
              <span className="kg-answer-icon">✓</span>
              <span className="assistant-answer-text">{answerText}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. 3D KNOWLEDGE GRAPH CANVAS (Below the assistant query box) */}
      <div className="kg-canvas-container-inner">
        <div className="kg-hero-canvas-wrap" ref={mountRef} />

        {/* Traversal Path & Legend overlay at bottom of canvas */}
        <div className="kg-hero-overlay-bottom">
          {(phase === 'traversing' || phase === 'answered') && (
            <div className="kg-traversal-path fade-in">
              {scenario.path.map((nodeId, i) => {
                const node = NODES.find(n => n.id === nodeId);
                const active = i <= traversalStep;
                return (
                  <React.Fragment key={nodeId}>
                    <div className={`kg-path-node ${active ? 'active' : ''}`}>
                      <div
                        className="kg-path-dot"
                        style={{ background: active ? `#${(NODE_COLORS[node?.type] ?? 0xffffff).toString(16).padStart(6, '0')}` : undefined }}
                      />
                      <span className="kg-path-label">{node?.label}</span>
                    </div>
                    {i < scenario.path.length - 1 && (
                      <div className={`kg-path-arrow ${i < traversalStep ? 'active' : ''}`}>→</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="kg-hero-legend">
            {[
              { type: 'product',  label: 'Product' },
              { type: 'standard', label: 'Standard' },
              { type: 'qco',      label: 'QCO' },
              { type: 'scheme',   label: 'Scheme' },
              { type: 'lab',      label: 'Lab' },
            ].map(({ type, label }) => (
              <div key={type} className="kg-legend-item">
                <span
                  className="kg-legend-dot"
                  style={{ background: `#${(NODE_COLORS[type] ?? 0xffffff).toString(16).padStart(6, '0')}` }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
