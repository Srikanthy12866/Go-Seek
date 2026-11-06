import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatMemoryBytes } from '../lib/formatters';

export default function ApplicationsPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Applications" icon="grid"><DataRow label="Access" value="Application process monitoring requires the desktop app." /></DataPanel>;

  const applications = hardware.applications || [];
  return <DataPanel title="Current user applications" icon="grid" className="application-panel">
    {!hardware.applicationsSupported ? <p className="application-empty">Application process monitoring is currently available on Linux desktop.</p> : applications.length ? <>
      <div className="application-process-heading"><span>APPLICATION / PROCESS</span><span>CPU</span><span>MEMORY</span></div>
      <div className="application-process-list">{applications.map((application) => {
        const cpuPercent = Number.isFinite(application.cpuPercent) ? Math.max(application.cpuPercent, 0) : null;
        const cpuBar = Math.min(cpuPercent || 0, 100);
        const memoryPercent = Number.isFinite(application.memoryPercent) ? Math.max(0, Math.min(application.memoryPercent, 100)) : null;
        return <div className="application-process-row" key={`${application.pid}-${application.started || ''}`}>
          <div className="application-process-name"><strong>{application.name}</strong><span>PID {application.pid} · {application.state || 'state unavailable'} · {application.childProcessCount} child processes</span></div>
          <div className="application-resource"><div><span>CPU</span><strong>{cpuPercent == null ? 'Not reported' : `${cpuPercent.toFixed(1)}%`}</strong></div><div className="application-meter" role="meter" aria-label={`${application.name} CPU utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={cpuBar}><span className="application-cpu-bar" style={{ width: `${cpuBar}%` }} /></div></div>
          <div className="application-resource"><div><span>RAM</span><strong>{memoryPercent == null ? 'Not reported' : `${memoryPercent.toFixed(1)}%`} · {formatMemoryBytes(application.residentBytes)}</strong></div><div className="application-meter" role="meter" aria-label={`${application.name} memory utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={memoryPercent || 0}><span className="application-memory-bar" style={{ width: `${memoryPercent || 0}%` }} /></div></div>
        </div>;
      })}</div>
    </> : <p className="application-empty">No graphical applications were detected for the logged-in user.</p>}
    <div className="overview-dashboard-foot">Current-user graphical processes only. OS services, command lines, and executable paths are excluded.</div>
  </DataPanel>;
}