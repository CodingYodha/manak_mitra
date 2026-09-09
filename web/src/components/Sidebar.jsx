import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Network,
  FileText,
  ShieldCheck,
  Layers,
  FlaskConical,
  BarChart3,
  PhoneCall,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenPassport,
  isCollapsed = false,
  onToggleCollapse,
  isSlidHidden = false,
  onToggleSlide,
  sidebarWidth = 270,
  isResizing = false,
  onStartResize,
  onResetResize
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  // Keyboard shortcuts:
  // Ctrl+B / Cmd+B -> Toggle collapse to icon-rail
  // Ctrl+\ / Cmd+\ -> Slide completely off-canvas / in
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (onToggleCollapse) onToggleCollapse();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.key === '|')) {
        e.preventDefault();
        if (onToggleSlide) onToggleSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse, onToggleSlide]);

  // Touch edge swipe gesture: Swipe right from screen edge (<35px) slides sidebar in
  useEffect(() => {
    let edgeStartX = null;
    const onEdgeTouchStart = (e) => {
      if (e.touches[0].clientX < 35) {
        edgeStartX = e.touches[0].clientX;
      }
    };
    const onEdgeTouchEnd = (e) => {
      if (edgeStartX !== null) {
        const diff = e.changedTouches[0].clientX - edgeStartX;
        if (diff > 45) {
          if (isSlidHidden && onToggleSlide) {
            onToggleSlide();
          } else {
            setMobileOpen(true);
          }
        }
        edgeStartX = null;
      }
    };
    window.addEventListener('touchstart', onEdgeTouchStart, { passive: true });
    window.addEventListener('touchend', onEdgeTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onEdgeTouchStart);
      window.removeEventListener('touchend', onEdgeTouchEnd);
    };
  }, [isSlidHidden, onToggleSlide]);

  // Handle touch swipe on sidebar: swipe left to slide closed
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX !== null) {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (diff < -50) {
        if (mobileOpen) {
          setMobileOpen(false);
        } else if (onToggleSlide && !isSlidHidden) {
          onToggleSlide();
        }
      }
      setTouchStartX(null);
    }
  };

  const navGroups = [
    {
      groupTitle: 'INTELLIGENCE CORE',
      items: [
        {
          id: 'assistant',
          label: 'AI Assistant',
          hindi: 'एआई सहायक',
          icon: MessageSquare,
          badge: 'Bilingual'
        },
        {
          id: 'graph',
          label: 'Standards Graph',
          hindi: 'मानक ग्राफ',
          icon: Network,
          badge: '23.5k'
        }
      ]
    },
    {
      groupTitle: 'COMPLIANCE & AUDIT',
      items: [
        {
          id: 'passport',
          label: 'Compliance Passport',
          hindi: 'अनुपालन पासपोर्ट',
          icon: FileText,
          badge: 'Beat 3'
        },
        {
          id: 'verifier',
          label: 'Mark Verifier',
          hindi: 'चिह्न सत्यापन',
          icon: ShieldCheck,
          badge: 'HUID/ISI'
        },
        {
          id: 'schemes',
          label: 'Certification Schemes',
          hindi: 'प्रमाणन योजनाएं',
          icon: Layers,
          badge: '4 Schemes'
        },
        {
          id: 'labs',
          label: 'Testing Labs',
          hindi: 'परीक्षण प्रयोगशालाएं',
          icon: FlaskConical,
          badge: 'Pan-India'
        }
      ]
    },
    {
      groupTitle: 'REGULATORY TELEMETRY',
      items: [
        {
          id: 'dashboard',
          label: 'Ministry Analytics',
          hindi: 'मंत्रालय विश्लेषिकी',
          icon: BarChart3,
          badge: 'MoCA'
        }
      ]
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* 1. MOBILE RESPONSIVE TOP BAR (Visible only on screens < 1024px) */}
      <header className="mobile-nav-bar">
        <button
          className="mobile-menu-trigger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="mobile-brand" onClick={() => handleSelectTab('assistant')}>
          <div className="nav-logo-mark">M</div>
          <div>
            <span className="nav-title">Manak Mitra</span>
            <span className="hindi" style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px' }}>मानक मित्र</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="tel:1800114000"
            className="btn-icon-circular"
            title="Helpline 1800-11-4000"
            style={{ width: '34px', height: '34px' }}
          >
            <PhoneCall size={14} />
          </a>
          <button
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
            onClick={() => {
              onOpenPassport();
              setMobileOpen(false);
            }}
          >
            Passport
          </button>
        </div>
      </header>

      {/* 2. MOBILE BACKDROP OVERLAY */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 3. PERSISTENT FIXED SIDEBAR (Collapsible, Slidable, and Dynamically Resizable) */}
      <aside
        className={`airtable-sidebar ${mobileOpen ? 'mobile-open' : ''} ${isSlidHidden ? 'slid-hidden' : ''}`}
        style={{
          width: isCollapsed ? 68 : isSlidHidden ? 0 : sidebarWidth
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Brand Header */}
        <div className={`sidebar-brand-header ${isCollapsed ? 'collapsed-header' : ''}`}>
          {!isCollapsed ? (
            <>
              <a
                href="#"
                className="nav-brand"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectTab('assistant');
                }}
              >
                <div className="nav-logo-mark">M</div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="nav-title">Manak Mitra</span>
                    <span className="hindi">मानक मित्र</span>
                  </div>
                  <div className="sidebar-subtitle">
                    BIS Regulatory Intelligence · SIH 2026
                  </div>
                </div>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                {/* Desktop Collapse Toggle Button (shrink to 68px rail) */}
                <button
                  className="sidebar-toggle-btn"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar to icon-rail (Ctrl+B)"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={17} />
                </button>

                {/* Desktop Slide-Off Button (slide completely off-canvas) */}
                <button
                  className="sidebar-toggle-btn"
                  onClick={onToggleSlide}
                  title="Slide sidebar off-canvas (Ctrl+\)"
                  aria-label="Slide off-canvas"
                >
                  <ChevronsLeft size={17} />
                </button>

                {/* Close button for mobile drawer */}
                <button
                  className="sidebar-mobile-close"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="collapsed-header-inner">
              <div
                className="nav-logo-mark"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectTab('assistant')}
                title="Manak Mitra मानक मित्र"
              >
                M
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                {/* Desktop Expand Toggle Button */}
                <button
                  className="sidebar-toggle-btn"
                  onClick={onToggleCollapse}
                  title="Expand sidebar (Ctrl+B)"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen size={17} />
                </button>

                {/* Slide completely off-canvas */}
                <button
                  className="sidebar-toggle-btn"
                  onClick={onToggleSlide}
                  title="Slide sidebar off-canvas (Ctrl+\)"
                  aria-label="Slide off-canvas"
                >
                  <ChevronsLeft size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Item Groups */}
        <div className="sidebar-scroll-content">
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="sidebar-group">
              {!isCollapsed && (
                <div className="sidebar-group-title">{group.groupTitle}</div>
              )}
              <nav className="sidebar-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed-item' : ''}`}
                      onClick={() => handleSelectTab(item.id)}
                    >
                      <div className="sidebar-item-content">
                        <Icon size={17} className="sidebar-item-icon" />
                        {!isCollapsed && (
                          <span className="sidebar-item-label">{item.label}</span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span className={`sidebar-item-badge ${isActive ? 'active-badge' : ''}`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip on hover when collapsed */}
                      {isCollapsed && (
                        <div className="sidebar-collapsed-tooltip">
                          <div className="tooltip-title">{item.label}</div>
                          <div className="tooltip-sub">{item.hindi}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Quick CTA Box inside sidebar */}
          {!isCollapsed ? (
            <div className="sidebar-cta-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Sparkles size={14} style={{ color: '#aa2d00' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#aa2d00' }}>
                  DEMO BEAT 3
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
                Compliance Passport
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.4, marginBottom: '10px' }}>
                Generate a 1-page legally grounded dossier for any Indian Standard.
              </p>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '9px 12px', fontSize: '12.5px', borderRadius: '8px' }}
                onClick={() => {
                  onOpenPassport();
                  setMobileOpen(false);
                }}
              >
                <FileText size={14} />
                Open Dossier Generator
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button
                className="sidebar-item collapsed-item"
                style={{ background: '#fafaf9', border: '1px solid #e7e5e4' }}
                onClick={() => {
                  onOpenPassport();
                  setMobileOpen(false);
                }}
                title="Compliance Passport (Demo Beat 3)"
              >
                <Sparkles size={17} style={{ color: '#aa2d00' }} />
                <div className="sidebar-collapsed-tooltip">
                  <div className="tooltip-title">Compliance Passport</div>
                  <div className="tooltip-sub">Demo Beat 3 Dossier</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Official Helpline & Govt Attribution */}
        <div className={`sidebar-footer ${isCollapsed ? 'collapsed-footer' : ''}`}>
          {!isCollapsed ? (
            <>
              <a href="tel:1800114000" className="sidebar-helpline-card">
                <div className="helpline-icon-wrap">
                  <PhoneCall size={16} />
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 600 }}>
                    OFFICIAL TOLL-FREE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    1800-11-4000
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    National Consumer Helpline
                  </div>
                </div>
              </a>

              <div className="sidebar-attribution">
                <span>Ministry of Consumer Affairs</span>
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span>BIS Standards</span>
              </div>
            </>
          ) : (
            <a
              href="tel:1800114000"
              className="btn-icon-circular"
              style={{ width: '38px', height: '38px', margin: '0 auto', position: 'relative' }}
              title="Official Toll-Free Helpline: 1800-11-4000"
            >
              <PhoneCall size={15} />
              <div className="sidebar-collapsed-tooltip">
                <div className="tooltip-title">Helpline 1800-11-4000</div>
                <div className="tooltip-sub">National Consumer Helpline</div>
              </div>
            </a>
          )}
        </div>

        {/* 4. DYNAMIC EDGE RESIZE / SLIDER HANDLE (Desktop drag-to-resize) */}
        {!isSlidHidden && (
          <div
            className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`}
            onMouseDown={onStartResize}
            onTouchStart={onStartResize}
            onDoubleClick={onResetResize}
            title="Drag edge to dynamically resize sidebar width · Double click to reset to 270px"
            aria-label="Resize sidebar width"
          >
            <div className="resize-handle-line" />
          </div>
        )}
      </aside>
    </>
  );
}
