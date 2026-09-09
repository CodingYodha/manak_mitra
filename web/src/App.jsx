import React, { lazy, Suspense, useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import ChatAssistant from './components/Chat/ChatAssistant';
import CompliancePassport from './components/Passport/CompliancePassport';
import MarkVerifier from './components/MarkVerifier/MarkVerifier';
import SchemeTimeline from './components/Schemes/SchemeTimeline';
import MinistryDashboard from './components/Dashboard/MinistryDashboard';
import ComplianceJourney from './components/ComplianceJourney';
import Footer from './components/Footer';

import { ChevronsRight, MapPin, Sparkles } from 'lucide-react';

// The 3D graph renderer is the heaviest part of the product. Loading it only
// when requested keeps the assistant and compliance workflows immediately usable.
const StandardsGraph = lazy(() => import('./components/KnowledgeGraph/StandardsGraph'));
const LabLocator = lazy(() => import('./components/LabLocator/LabLocator'));

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    return ['home', 'ai', 'graph', 'journey', 'passport', 'verifier', 'schemes', 'labs', 'dashboard'].includes(requested) ? requested : 'home';
  });
  const [focusedStandard, setFocusedStandard] = useState(null);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'ai' ? params.get('q') : null;
  });
  const [passportProduct, setPassportProduct] = useState(() => new URLSearchParams(window.location.search).get('product') || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Ensure sidebar always defaults to open upon page refresh
  useEffect(() => {
    try {
      localStorage.removeItem('manak_sidebar_open');
    } catch {}
  }, []);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('manak_sidebar_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 180 && val <= 520) return val;
      }
    } catch {}
    return 270;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Dynamic edge resizing across window
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const clientX = e.clientX;
      const clamped = Math.max(180, Math.min(clientX, 520));
      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('manak_sidebar_width', String(sidebarWidth));
      } catch {}
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        handleMouseMove({ clientX: e.touches[0].clientX });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  const handleStartResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResetResize = () => {
    setSidebarWidth(270);
    try {
      localStorage.setItem('manak_sidebar_width', '270');
    } catch {}
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSelectStandard = (isNumber) => {
    setFocusedStandard(isNumber);
    setActiveTab('graph');
  };

  const handleOpenPassport = (product = '') => {
    if (product) {
      setPassportProduct(product);
      const url = new URL(window.location.href);
      url.searchParams.set('product', product);
      window.history.replaceState({}, '', url);
    }
    setActiveTab('passport');
  };

  const handleOpenVerifier = () => {
    setActiveTab('verifier');
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'home') url.searchParams.delete('view');
    else url.searchParams.set('view', tab);
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`airtable-site app-layout-with-sidebar ${
        !isSidebarOpen ? 'sidebar-closed' : ''
      } ${isResizing ? 'sidebar-resizing' : ''}`}
    >
      {/* 1. PERSISTENT FIXED SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab)}
        onOpenPassport={handleOpenPassport}
        isOpen={isSidebarOpen}
        onClose={handleToggleSidebar}
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        onStartResize={handleStartResize}
        onResetResize={handleResetResize}
      />

      {/* Floating Expand Tab (>>) when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          className="sidebar-open-tab"
          onClick={() => setIsSidebarOpen(true)}
          title="Expand sidebar (Ctrl+B)"
          aria-label="Expand sidebar"
        >
          <ChevronsRight size={18} />
        </button>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <div
        className={`app-main-content ${activeTab === 'ai' ? 'chat-fullscreen-mode' : ''}`}
        style={{
          marginLeft: isSidebarOpen ? `${sidebarWidth}px` : '0px',
          width: isSidebarOpen ? `calc(100% - ${sidebarWidth}px)` : '100%'
        }}
      >
        {/* ── LANDING PAGE ── */}
        {activeTab === 'home' && (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenPassport={handleOpenPassport}
            onOpenVerifier={handleOpenVerifier}
          />
        )}

        {/* ── AI ASSISTANT (Dedicated Fullscreen ChatGPT View) ── */}
        {activeTab === 'ai' && (
          <ChatAssistant
            onSelectNode={handleSelectStandard}
            onViewPassport={handleOpenPassport}
            initialQuery={initialAssistantQuery}
            onNavigate={handleNavigate}
          />
        )}

        {/* ── STANDARDS KNOWLEDGE GRAPH ── */}
        {activeTab === 'graph' && (
          <Suspense fallback={(
            <div className="page-state-panel" role="status">
              <Sparkles size={22} />
              <strong>Preparing the standards graph…</strong>
              <span>Loading the 26,835-node catalogue on demand.</span>
            </div>
          )}>
            <StandardsGraph
              focusedStandard={focusedStandard}
              onSelectStandard={(std) => setFocusedStandard(std)}
            />
          </Suspense>
        )}

        {/* ── COMPLIANCE JOURNEY ── */}
        {activeTab === 'journey' && (
          <ComplianceJourney
            onOpenPassport={handleOpenPassport}
            onOpenLabs={() => handleNavigate('labs')}
          />
        )}

        {/* ── COMPLIANCE PASSPORT ── */}
        {activeTab === 'passport' && (
          <CompliancePassport initialProduct={passportProduct} />
        )}

        {/* ── MARK VERIFIER ── */}
        {activeTab === 'verifier' && (
          <MarkVerifier />
        )}

        {/* ── CERTIFICATION SCHEMES ── */}
        {activeTab === 'schemes' && (
          <SchemeTimeline />
        )}

        {/* ── TESTING LABORATORIES ── */}
        {activeTab === 'labs' && (
          <Suspense fallback={(
            <div className="page-state-panel" role="status">
              <MapPin size={22} />
              <strong>Preparing the laboratory map…</strong>
              <span>Loading verified scopes and map tiles on demand.</span>
            </div>
          )}>
            <LabLocator />
          </Suspense>
        )}

        {/* ── MINISTRY DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <MinistryDashboard />
        )}

        {/* FOOTER (Shown on other pages, hidden on AI assistant full-screen) */}
        {activeTab !== 'ai' && <Footer onNavigate={(tab) => setActiveTab(tab)} />}
      </div>
    </div>
  );
}
