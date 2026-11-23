import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatMemoryBytes } from '../lib/formatters';
import { fetchApplicationsData } from '../services/applicationsService';

export default function ApplicationsPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('all'); // 'all' | 'cpu' | 'mem'

  useEffect(() => {
    let mounted = true;
    fetchApplicationsData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;
  if (activeHardware.runtime !== 'desktop') {
    return (
      <DataPanel title="Applications" icon="grid">
        <DataRow label="Access" value="Application process monitoring requires the desktop app." />
      </DataPanel>
    );
  }

  const rawApplications = activeHardware.applications || [];

  const filteredApplications = rawApplications
    .filter((app) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (app.name && app.name.toLowerCase().includes(q)) || String(app.pid).includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'cpu') return (b.cpuPercent || 0) - (a.cpuPercent || 0);
      if (sortBy === 'mem') return (b.memoryPercent || 0) - (a.memoryPercent || 0);
      return ((b.cpuPercent || 0) * 2 + (b.memoryPercent || 0)) - ((a.cpuPercent || 0) * 2 + (a.memoryPercent || 0));
    });

  return (
    <DataPanel title="Current user applications" icon="grid" className="application-panel">
      {!activeHardware.applicationsSupported ? (
        <p className="application-empty">Application process monitoring is currently unavailable on this platform.</p>
      ) : rawApplications.length ? (
        <>
          {/* Process Inspector Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1f2937', padding: '6px 12px', borderRadius: '8px', border: '1px solid #374151' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>🔍</span>
              <input
                type="text"
                placeholder="Filter by name or PID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f3f4f6', fontSize: '12px', outline: 'none', width: '180px' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`chart-mode-btn ${sortBy === 'all' ? 'active' : ''}`}
                onClick={() => setSortBy('all')}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Balanced
              </button>
              <button
                type="button"
                className={`chart-mode-btn ${sortBy === 'cpu' ? 'active' : ''}`}
                onClick={() => setSortBy('cpu')}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Top CPU
              </button>
              <button
                type="button"
                className={`chart-mode-btn ${sortBy === 'mem' ? 'active' : ''}`}
                onClick={() => setSortBy('mem')}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Top Memory
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>
            Showing {filteredApplications.length} of {rawApplications.length} active user processes
          </div>

          <div className="application-process-heading">
            <span>APPLICATION / PROCESS</span>
            <span>CPU UTILIZATION</span>
            <span>MEMORY (RAM)</span>
          </div>

          <div className="application-process-list">
            {filteredApplications.map((application) => {
              const cpuPercent = Number.isFinite(application.cpuPercent) ? Math.max(application.cpuPercent, 0) : null;
              const cpuBar = Math.min(cpuPercent || 0, 100);
              const memoryPercent = Number.isFinite(application.memoryPercent) ? Math.max(0, Math.min(application.memoryPercent, 100)) : null;

              return (
                <div className="application-process-row" key={`${application.pid}-${application.started || ''}`}>
                  <div className="application-process-name">
                    <strong>{application.name}</strong>
                    <span>
                      PID {application.pid} · {application.state || 'running'} · {application.childProcessCount || 0} children
                    </span>
                  </div>

                  <div className="application-resource">
                    <div>
                      <span>CPU</span>
                      <strong>{cpuPercent == null ? '0.0%' : `${cpuPercent.toFixed(1)}%`}</strong>
                    </div>
                    <div className="application-meter" role="meter" aria-label={`${application.name} CPU`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={cpuBar}>
                      <span className="application-cpu-bar" style={{ width: `${cpuBar}%` }} />
                    </div>
                  </div>

                  <div className="application-resource">
                    <div>
                      <span>RAM</span>
                      <strong>
                        {memoryPercent == null ? '0.0%' : `${memoryPercent.toFixed(1)}%`} · {formatMemoryBytes(application.residentBytes)}
                      </strong>
                    </div>
                    <div className="application-meter" role="meter" aria-label={`${application.name} RAM`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={memoryPercent || 0}>
                      <span className="application-memory-bar" style={{ width: `${memoryPercent || 0}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="application-empty">No graphical processes were detected for the current user.</p>
      )}

      <div className="overview-dashboard-foot">
        Real-time user process inspector. System services and kernel threads are excluded for safety.
      </div>
    </DataPanel>
  );
}
