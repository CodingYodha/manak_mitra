import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import ChatAssistant from './components/Chat/ChatAssistant';
import StandardsGraph from './components/KnowledgeGraph/StandardsGraph';
import CompliancePassport from './components/Passport/CompliancePassport';
import MarkVerifier from './components/MarkVerifier/MarkVerifier';
import SchemeTimeline from './components/Schemes/SchemeTimeline';
import LabLocator from './components/LabLocator/LabLocator';
import MinistryDashboard from './components/Dashboard/MinistryDashboard';
import Footer from './components/Footer';

import { ChevronsRight, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [focusedStandard, setFocusedStandard] = useState(null);
  const [initialAssistantQuery, setInitialAssistantQuery] = useState(null);
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

  const handleOpenPassport = () => {
    setActiveTab('passport');
  };

  const handleOpenVerifier = () => {
    setActiveTab('verifier');
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
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
        className="app-main-content"
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

        {/* ── AI ASSISTANT (clean, dedicated view) ── */}
        {activeTab === 'ai' && (
          <section className="ai-page-wrapper">
            <div className="container">
              <div className="ai-page-header">
                <div className="ai-page-header-icon">
                  <Sparkles size={20} color="#aa2d00" />
                </div>
                <div>
                  <h1 className="title-lg" style={{ marginBottom: '4px' }}>
                    Bilingual Regulatory Query Interface
                  </h1>
                  <p className="body-md" style={{ color: 'var(--color-muted)' }}>
                    Ask in Hindi or English — grounded in gazetted orders with zero hallucination.
                    Covers QCOs, Indian Standards, testing labs, and certification schemes.
                  </p>
                </div>
              </div>
              <ChatAssistant
                onSelectNode={handleSelectStandard}
                onViewPassport={handleOpenPassport}
                initialQuery={initialAssistantQuery}
              />
            </div>
          </section>
        )}

        {/* ── STANDARDS KNOWLEDGE GRAPH ── */}
        {activeTab === 'graph' && (
          <StandardsGraph
            focusedStandard={focusedStandard}
            onSelectStandard={(std) => setFocusedStandard(std)}
          />
        )}

        {/* ── COMPLIANCE PASSPORT ── */}
        {activeTab === 'passport' && (
          <CompliancePassport />
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
          <LabLocator />
        )}

        {/* ── MINISTRY DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <MinistryDashboard />
        )}

        {/* FOOTER */}
        <Footer onNavigate={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}
