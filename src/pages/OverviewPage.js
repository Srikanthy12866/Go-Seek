import { useEffect, useState } from 'react';
import { DataPanel } from '../components/HardwareUI';
import ComputeDashboard from '../components/ComputeDashboard';
import { useHardware } from '../context/HardwareContext';
import { formatMemoryBytes, formatRate, sumRates } from '../lib/formatters';
import { fetchOverviewData } from '../services/overviewService';

export default function OverviewPage() {
  const { hardware, frequencyHistory } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchOverviewData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;

  if (activeHardware.runtime !== 'desktop') {
    return <div className="panel-grid">
      <DataPanel title="Browser snapshot" icon="globe">
        <div className="data-row"><span>Browser</span><strong>{activeHardware.browser}</strong></div>
        <div className="data-row"><span>Operating system</span><strong>{activeHardware.operatingSystem}</strong></div>
        <div className="data-row"><span>Logical processors</span><strong>{activeHardware.cpuThreads}</strong></div>
      </DataPanel>
      <DataPanel title="Display & network" icon="display">
        <div className="data-row"><span>Screen</span><strong>{activeHardware.screen}</strong></div>
        <div className="data-row"><span>Connection</span><strong>{activeHardware.networkStatus} · {activeHardware.networkType}</strong></div>
        <div className="data-row"><span>Graphics</span><strong>{typeof activeHardware.graphics === 'string' ? activeHardware.graphics : (Array.isArray(activeHardware.graphics) ? activeHardware.graphics[0]?.model || 'Graphics adapter' : 'Integrated graphics')}</strong></div>
      </DataPanel>
    </div>;
  }

  const totalMemory = activeHardware.memory?.totalBytes;
  const availableMemory = activeHardware.memory?.availableBytes;
  const hasMemoryData = Number.isFinite(totalMemory) && totalMemory > 0 && Number.isFinite(availableMemory);
  const usedMemory = hasMemoryData ? Math.max(totalMemory - availableMemory, 0) : null;
  const usedPercent = hasMemoryData ? Math.max(0, Math.min((usedMemory / totalMemory) * 100, 100)) : null;
  const network = (activeHardware.network || []).filter(item => !item.internal && !item.virtual);
  const activeLinks = network.filter(item => item.operstate === 'up').length;
  const receiveRate = sumRates(activeHardware.networkTraffic || [], 'rx_sec');
  const transmitRate = sumRates(activeHardware.networkTraffic || [], 'tx_sec');
  const storageReadRate = activeHardware.storageIO?.readBytesPerSecond;
  const storageWriteRate = activeHardware.storageIO?.writeBytesPerSecond;
  const maxStorageRate = Math.max(storageReadRate || 0, storageWriteRate || 0, 1);

  return <div className="overview-dashboard">
    <ComputeDashboard hardware={activeHardware} history={frequencyHistory} compact />
    <DataPanel title="Memory usage" icon="chip">
      <div className="memory-dashboard">
        <div className="memory-dashboard-heading"><strong>{formatMemoryBytes(usedMemory)}</strong><span>used of {formatMemoryBytes(totalMemory)}</span></div>
        <div className="memory-usage-track" role="meter" aria-label="Memory usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow={usedPercent ?? 0} aria-valuetext={usedPercent == null ? 'Not reported' : `${usedPercent.toFixed(2)}% used`}><span style={{ width: `${usedPercent ?? 0}%` }} /></div>
        <div className="memory-dashboard-legend"><span><i className="memory-used-key" /> In use <strong>{usedPercent == null ? 'Not reported' : `${usedPercent.toFixed(2)}%`}</strong></span><span><i className="memory-available-key" /> Available <strong>{formatMemoryBytes(availableMemory)}</strong></span></div>
      </div>
    </DataPanel>
    <DataPanel title="Network activity" icon="wifi">
      <div className="overview-rate-grid"><div><span>RECEIVE</span><strong>{formatRate(receiveRate)}</strong></div><div><span>TRANSMIT</span><strong>{formatRate(transmitRate)}</strong></div></div>
      <div className="overview-dashboard-foot">{activeLinks} active physical {activeLinks === 1 ? 'link' : 'links'} · addresses hidden</div>
    </DataPanel>
    <DataPanel title="Storage read / write" icon="chip">
      <div className="storage-rate-list">
        <div><div className="storage-rate-heading"><span>Read</span><strong>{formatRate(storageReadRate)}</strong></div><div className="storage-rate-track" role="meter" aria-label="Storage read speed" aria-valuemin="0" aria-valuemax={maxStorageRate} aria-valuenow={Number.isFinite(storageReadRate) ? storageReadRate : 0} aria-valuetext={formatRate(storageReadRate)}><span className="storage-read-bar" style={{ width: `${Number.isFinite(storageReadRate) ? (storageReadRate / maxStorageRate) * 100 : 0}%` }} /></div></div>
        <div><div className="storage-rate-heading"><span>Write</span><strong>{formatRate(storageWriteRate)}</strong></div><div className="storage-rate-track" role="meter" aria-label="Storage write speed" aria-valuemin="0" aria-valuemax={maxStorageRate} aria-valuenow={Number.isFinite(storageWriteRate) ? storageWriteRate : 0} aria-valuetext={formatRate(storageWriteRate)}><span className="storage-write-bar" style={{ width: `${Number.isFinite(storageWriteRate) ? (storageWriteRate / maxStorageRate) * 100 : 0}%` }} /></div></div>
      </div>
      <div className="overview-dashboard-foot">Aggregate throughput across available filesystems</div>
    </DataPanel>
  </div>;
}