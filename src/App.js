import { useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HardwareProvider, useHardware } from './context/HardwareContext';
import { Icon } from './components/HardwareUI';
import OverviewPage from './pages/OverviewPage';
import ComputePage from './pages/ComputePage';
import ApplicationsPage from './pages/ApplicationsPage';
import MemoryPage from './pages/MemoryPage';
import BoardPage from './pages/BoardPage';
import DisplayPage from './pages/DisplayPage';
import StoragePage from './pages/StoragePage';
import ConnectivityPage from './pages/ConnectivityPage';
import DevicesPage from './pages/DevicesPage';
import EnvironmentPage from './pages/EnvironmentPage';
import { searchParameters } from './lib/searchParameters';
import './App.css';

const sections = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'compute', label: 'Compute & graphics', icon: 'chip' },
  { id: 'applications', label: 'Applications', icon: 'grid' },
  { id: 'memory', label: 'Memory', icon: 'chip' },
  { id: 'board', label: 'Board & BIOS', icon: 'display' },
  { id: 'display', label: 'Display', icon: 'display' },
  { id: 'storage', label: 'Storage', icon: 'chip' },
  { id: 'connectivity', label: 'Connectivity', icon: 'wifi' },
  { id: 'devices', label: 'Devices & power', icon: 'display' },
  { id: 'environment', label: 'Browser environment', icon: 'globe' },
];

function AppLayout() {
  const { hardware, loading, refresh } = useHardware();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchResults = searchParameters(hardware, searchQuery);
  const visibleSections = window.deviceHardware
    ? sections
    : sections.filter(section => !['storage', 'devices', 'applications'].includes(section.id));

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(hardware, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'device-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(hardware, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  const selectSearchResult = (result) => {
    navigate(result.route);
    setSearchQuery('');
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink className="brand" to="/overview" aria-label="Go Seek home">
        <span className="brand-mark"><span /><span /><span /><span /></span>
        <span className="brand-name">GO SEEK<span> / SYSTEMS</span></span>
      </NavLink>
      <div className="sidebar-label">DEVICE REPORT</div>
      <nav className="side-nav" aria-label="Report sections">
        {visibleSections.map(section => <NavLink
          key={section.id}
          to={`/${section.id}`}
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          aria-label={section.label}
        >
          <Icon name={section.icon} /><span>{section.label}</span>{location.pathname === `/${section.id}` && <i />}
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom"><span className="live-dot" /> LOCAL SESSION<br /><strong>Data stays on this device</strong></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb">DIAGNOSTICS <span>/</span> DEVICE PROFILE</div>
        <div className="parameter-search">
          <Icon name="search" size={16} />
          <input
            aria-label="Search parameters"
            aria-controls="parameter-search-results"
            autoComplete="off"
            disabled={!hardware}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0]);
              if (event.key === 'Escape') setSearchQuery('');
            }}
            placeholder="Search parameters"
            role="searchbox"
            type="search"
            value={searchQuery}
          />
          {searchQuery.trim() && <div className="parameter-search-results" id="parameter-search-results" role="listbox" aria-label="Matching hardware parameters">
            {searchResults.length ? searchResults.map(result => <button key={result.key} role="option" aria-selected="false" className="parameter-search-result" onClick={() => selectSearchResult(result)}>
              <span><strong>{result.label}</strong><small>{result.value}</small></span>
              <span className="parameter-search-route">{result.route.slice(1)}</span>
            </button>) : <div className="parameter-search-empty">No matching parameters</div>}
          </div>}
        </div>
        <div className="topbar-status"><span className="live-dot" /> {window.deviceHardware ? 'LIVE · 1 SECOND' : 'BROWSER SNAPSHOT'}</div>
      </header>
      <div className="content-wrap">
        <div className="page-heading">
          <div><div className="eyebrow">HARDWARE & SYSTEM PROFILE <span>•</span> LIVE READOUT</div><h1>Your device,<br className="mobile-break" /> in detail.</h1><p className="subtitle">{window.deviceHardware ? 'Local operating-system hardware telemetry, refreshed every second.' : 'Browser-limited snapshot. Run the desktop app for host hardware details.'}</p></div>
          <div className="heading-actions"><button className="icon-button" onClick={copyReport} disabled={!hardware} title="Copy report JSON" aria-label="Copy report JSON"><Icon name={copied ? 'check' : 'copy'} /></button><button className="secondary-button" onClick={exportReport} disabled={!hardware}><Icon name="download" /> Export report</button><button className="primary-button" onClick={refresh} disabled={loading}><Icon name="refresh" /> {loading ? 'Reading…' : 'Refresh'}</button></div>
        </div>

        {!window.deviceHardware && <div className="notice-bar"><span className="notice-symbol">i</span><p><strong>Browser-limited report.</strong> Exact CPU model, installed RAM, disk inventory, serial numbers, and sensors are restricted to native system tools. Launch the desktop build to read the computer running this app.</p><NavLink className="notice-access-link" to="/environment">ABOUT ACCESS <span>↗</span></NavLink></div>}

        {hardware && <div className="snapshot-line"><span><span className="live-dot" /> CAPTURED {hardware.updatedAt.toLocaleTimeString()}</span><span>COLLECTION SOURCE <strong>{hardware.runtime === 'desktop' ? `${hardware.operatingSystem} · LOCAL HOST` : 'WEB PLATFORM APIs'}</strong></span></div>}

        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/compute" element={<ComputePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/connectivity" element={<ConnectivityPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/environment" element={<EnvironmentPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>

        {loading && !hardware && <div className="loading-state"><span className="loader" /> Reading available device information…</div>}
        <footer className="page-footer"><span>GO SEEK SYSTEMS <span className="footer-divider">/</span> DEVICE REPORT</span><span>LOCAL READOUT · NO DATA UPLOAD</span><span className="print-attribution">Powered by Srikanth Yepalagunta</span></footer>
      </div>
    </main>
  </div>;
}

export default function App() {
  return <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HardwareProvider><AppLayout /></HardwareProvider></HashRouter>;
}