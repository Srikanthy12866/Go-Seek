import { useEffect, useState } from 'react';
import './App.css';

const formatBytes = (value) => {
  if (!Number.isFinite(value) || value < 0) return 'Not reported';
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unitIndex).toFixed(unitIndex < 2 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatMemoryBytes = (value) => {
  if (!Number.isFinite(value) || value < 0) return 'Not reported';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = value === 0 ? 0 : Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** unitIndex).toFixed(2)} ${units[unitIndex]}`;
};

const formatRate = (value) => Number.isFinite(value) && value >= 0 ? `${formatBytes(value)}/s` : 'Not reported';
const formatFrequency = (value) => Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} GHz` : 'Not reported';
const formatPercent = (value) => Number.isFinite(value) ? `${Math.round(value)}%` : 'Not reported';
const sumRates = (samples, key) => {
  const rates = samples.map(sample => sample[key]).filter(Number.isFinite);
  return rates.length ? rates.reduce((total, rate) => total + rate, 0) : null;
};

const readHardware = async () => {
  if (window.deviceHardware?.getSnapshot) {
    const snapshot = await window.deviceHardware.getSnapshot();
    return { ...snapshot, updatedAt: new Date(snapshot.capturedAt) };
  }

  const nav = window.navigator;
  const screenInfo = window.screen;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const userAgent = nav.userAgent || '';
  const browser = userAgent.includes('Edg/')
    ? 'Microsoft Edge'
    : userAgent.includes('Firefox/')
      ? 'Mozilla Firefox'
      : userAgent.includes('Chrome/')
        ? 'Google Chrome'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Unknown browser';

  let graphics = 'Not exposed by this browser';
  try {
    if (/jsdom/i.test(userAgent)) throw new Error('Graphics information is not available in the test environment');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const extension = context && context.getExtension('WEBGL_debug_renderer_info');
    if (extension) graphics = context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
    else if (context) graphics = context.getParameter(context.RENDERER);
  } catch (error) {
    graphics = 'Unavailable';
  }

  let battery = 'Not supported';
  if (typeof nav.getBattery === 'function') {
    try {
      const batteryInfo = await nav.getBattery();
      battery = `${Math.round(batteryInfo.level * 100)}%${batteryInfo.charging ? ' · charging' : ''}`;
    } catch (error) {
      battery = 'Permission unavailable';
    }
  }

  let storage = 'Unavailable';
  if (nav.storage && nav.storage.estimate) {
    try {
      const estimate = await nav.storage.estimate();
      const available = estimate.quota ? `${(estimate.quota / 1024 ** 3).toFixed(1)} GB available to this site` : 'Estimate unavailable';
      const used = estimate.usage ? `${(estimate.usage / 1024 ** 2).toFixed(1)} MB used` : '0 MB used';
      storage = `${used} · ${available}`;
    } catch (error) {
      storage = 'Estimate unavailable';
    }
  }

  return {
    updatedAt: new Date(),
    browser,
    operatingSystem: nav.userAgentData?.platform || nav.platform || 'Not exposed',
    browserVersion: userAgent.match(/(?:Chrome|Firefox|Edg|Version)\/[\d.]+/)?.[0]?.split('/')[1] || 'Not exposed',
    cpuThreads: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} logical processors` : 'Not exposed',
    memory: nav.deviceMemory ? `About ${nav.deviceMemory} GB` : 'Not exposed',
    graphics,
    screen: `${screenInfo.width} × ${screenInfo.height}`,
    availableScreen: `${screenInfo.availWidth} × ${screenInfo.availHeight}`,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: `${window.devicePixelRatio || 1}×`,
    colorDepth: `${screenInfo.colorDepth || 'Unknown'} bit`,
    orientation: screenInfo.orientation?.type?.replace('-', ' ') || 'Not exposed',
    networkStatus: nav.onLine ? 'Online' : 'Offline',
    networkType: connection?.effectiveType || 'Not reported',
    downlink: connection?.downlink ? `${connection.downlink} Mbps` : 'Not reported',
    latency: connection?.rtt ? `${connection.rtt} ms` : 'Not reported',
    dataSaver: connection?.saveData ? 'On' : 'Off / not reported',
    battery,
    storage,
    touchPoints: nav.maxTouchPoints ? `${nav.maxTouchPoints} touch points` : 'No touch input reported',
    language: nav.language || 'Not exposed',
    languages: nav.languages?.join(', ') || nav.language || 'Not exposed',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookies: nav.cookieEnabled ? 'Enabled' : 'Disabled',
    userAgent,
  };
};

const sections = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'compute', label: 'Compute & graphics', icon: 'chip' },
  { id: 'memory', label: 'Memory', icon: 'chip' },
  { id: 'board', label: 'Board & BIOS', icon: 'display' },
  { id: 'display', label: 'Display', icon: 'display' },
  { id: 'storage', label: 'Storage', icon: 'chip' },
  { id: 'connectivity', label: 'Connectivity', icon: 'wifi' },
  { id: 'devices', label: 'Devices & power', icon: 'display' },
  { id: 'environment', label: 'Browser environment', icon: 'globe' },
];

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v5m6-5v5m-6 12v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5" /></>,
    display: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01" /><path d="M2 9a15 15 0 0 1 20 0" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5m-5 5V3" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function DataRow({ label, value, mono = false }) {
  return <div className="data-row"><span>{label}</span><strong className={mono ? 'mono' : ''}>{value || 'Not reported'}</strong></div>;
}

function DataPanel({ title, icon, children, className = '' }) {
  return <section className={`data-panel ${className}`}><div className="panel-heading"><span className="panel-icon"><Icon name={icon} size={17} /></span><h2>{title}</h2></div><div className="panel-content">{children}</div></section>;
}

function ComputeDashboard({ hardware, history, compact = false }) {
  const cpu = hardware.cpu;
  const frequencies = cpu.current || [];
  const utilization = cpu.perCoreUtilizationPercent || [];
  const samples = history.filter(sample => Number.isFinite(sample.frequency) && sample.frequency > 0);
  const maxFrequency = Math.max(cpu.maxSpeedGhz || 0, ...frequencies.filter(Number.isFinite), ...samples.map(sample => sample.frequency), 1);
  const points = samples.map((sample, index) => {
    const x = samples.length === 1 ? 250 : 12 + (index / (samples.length - 1)) * 476;
    const y = 104 - (sample.frequency / maxFrequency) * 84;
    return `${x},${y}`;
  }).join(' ');

  return <DataPanel title="CPU frequency & utilization" icon="chip">
    <div className="compute-dashboard">
      <div className="compute-metrics">
        <div><span>Average clock</span><strong>{formatFrequency(cpu.averageSpeedGhz)}</strong></div>
        <div><span>CPU utilization</span><strong>{formatPercent(cpu.utilizationPercent)}</strong></div>
        <div><span>Rated maximum</span><strong>{formatFrequency(cpu.maxSpeedGhz)}</strong></div>
      </div>
      <div className="frequency-chart">
        <div className="frequency-chart-heading"><strong>Average clock trend</strong><span>Last 60 seconds</span></div>
        {samples.length ? <svg role="img" aria-label="CPU average frequency trend over the last minute" viewBox="0 0 500 120" preserveAspectRatio="none">
          <line className="frequency-gridline" x1="8" x2="492" y1="20" y2="20" />
          <line className="frequency-gridline" x1="8" x2="492" y1="62" y2="62" />
          <line className="frequency-gridline" x1="8" x2="492" y1="104" y2="104" />
          {samples.length > 1 && <polyline className="frequency-trend-line" points={points} />}
          <circle className="frequency-trend-dot" cx={samples.length === 1 ? 250 : 488} cy={104 - (samples[samples.length - 1].frequency / maxFrequency) * 84} r="4" />
        </svg> : <div className="frequency-chart-empty">Waiting for valid frequency samples</div>}
        <div className="frequency-chart-axis"><span>60s ago</span><span>Now</span></div>
      </div>
      {!compact && <div className="core-readings" aria-label="Per-core frequency and utilization">
        {frequencies.length ? frequencies.map((frequency, index) => {
          const frequencyPercent = Number.isFinite(frequency) ? Math.min((frequency / maxFrequency) * 100, 100) : 0;
          const coreLoad = utilization[index];
          const loadPercent = Number.isFinite(coreLoad) ? Math.max(0, Math.min(coreLoad, 100)) : 0;
          return <div className="core-reading" key={`core-${index}`}>
            <div className="core-reading-heading"><span>Core {index}</span><strong>{formatFrequency(frequency)}</strong><span>{formatPercent(coreLoad)}</span></div>
            <div className="frequency-track" role="meter" aria-label={`Core ${index} frequency`} aria-valuemin="0" aria-valuemax={maxFrequency} aria-valuenow={Number.isFinite(frequency) ? frequency : 0}><span style={{ width: `${frequencyPercent}%` }} /></div>
            <div className="utilization-track" role="meter" aria-label={`Core ${index} utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={loadPercent}><span style={{ width: `${loadPercent}%` }} /></div>
          </div>;
        }) : <p className="frequency-chart-empty">Per-core frequency readings are unavailable</p>}
      </div>}
      {!compact && hardware.graphics.length > 0 && <div className="gpu-readings">
        <div className="frequency-chart-heading"><strong>GPU clocks & activity</strong><span>Driver reported</span></div>
        {hardware.graphics.map((gpu, index) => {
          const gpuLoad = Number.isFinite(gpu.utilizationGpu) ? Math.max(0, Math.min(gpu.utilizationGpu, 100)) : 0;
          return <div className="gpu-reading" key={`gpu-${index}`}>
            <div className="gpu-reading-heading"><span>{gpu.model || gpu.name || `GPU ${index + 1}`}</span><strong>{formatPercent(gpu.utilizationGpu)}</strong></div>
            <div className="gpu-reading-metrics"><span>Core {Number.isFinite(gpu.clockCore) && gpu.clockCore > 0 ? `${gpu.clockCore} MHz` : 'N/A'}</span><span>Memory {Number.isFinite(gpu.clockMemory) && gpu.clockMemory > 0 ? `${gpu.clockMemory} MHz` : 'N/A'}</span><span>{Number.isFinite(gpu.temperatureGpu) ? `${gpu.temperatureGpu} °C` : 'N/A'}</span></div>
            <div className="utilization-track" role="meter" aria-label={`Graphics processor ${index + 1} utilization`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={gpuLoad}><span style={{ width: `${gpuLoad}%` }} /></div>
          </div>;
        })}
      </div>}
    </div>
  </DataPanel>;
}

function OverviewDashboard({ hardware, frequencyHistory }) {
  const totalMemory = hardware.memory.totalBytes;
  const availableMemory = hardware.memory.availableBytes;
  const hasMemoryData = Number.isFinite(totalMemory) && totalMemory > 0 && Number.isFinite(availableMemory);
  const usedMemory = hasMemoryData ? Math.max(totalMemory - availableMemory, 0) : null;
  const usedPercent = hasMemoryData ? Math.max(0, Math.min((usedMemory / totalMemory) * 100, 100)) : null;
  const network = (hardware.network || []).filter(item => !item.internal && !item.virtual);
  const activeLinks = network.filter(item => item.operstate === 'up').length;
  const receiveRate = sumRates(hardware.networkTraffic || [], 'rx_sec');
  const transmitRate = sumRates(hardware.networkTraffic || [], 'tx_sec');
  const storageReadRate = hardware.storageIO?.readBytesPerSecond;
  const storageWriteRate = hardware.storageIO?.writeBytesPerSecond;
  const maxStorageRate = Math.max(storageReadRate || 0, storageWriteRate || 0, 1);

  return <div className="overview-dashboard">
    <ComputeDashboard hardware={hardware} history={frequencyHistory} compact />
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

function DesktopHardwareDetails({ hardware, visible, frequencyHistory }) {
  if (hardware.runtime !== 'desktop' || visible === 'overview') return null;

  const storage = hardware.storage || {};
  const network = (hardware.network || []).filter(item => !item.internal && !item.virtual);
  const networkTraffic = hardware.networkTraffic || [];
  const usb = hardware.usb || [];
  const pci = hardware.pci || [];
  const battery = hardware.battery || {};
  const sensors = hardware.sensors || {};

  return <>
    {visible === 'compute' && <ComputeDashboard hardware={hardware} history={frequencyHistory} />}
    {visible === 'compute' && <DataPanel title="Firmware & sensors" icon="chip"><DataRow label="CPU microcode revision" value={hardware.cpu.microcodeRevision} /><DataRow label="CPU temperature" value={hardware.cpu.temperatureC != null ? `${hardware.cpu.temperatureC} °C` : 'Not reported'} /><DataRow label="Per-core temperatures" value={hardware.cpu.perCoreTemperatureC?.length ? hardware.cpu.perCoreTemperatureC.map((value, index) => `C${index} ${value} °C`).join(' · ') : 'Not reported'} />{(sensors.fans || []).map((fan, index) => <DataRow key={`fan-${index}`} label={fan.label || `Fan ${index + 1}`} value={`${fan.rpm} RPM${fan.controller ? ` · ${fan.controller}` : ''}`} />)}{hardware.graphics.map((gpu, index) => <div key={`gpu-sensor-${index}`}><DataRow label={`GPU ${index + 1} driver`} value={gpu.driverVersion} /><DataRow label="GPU core / memory clock" value={`${gpu.clockCore ? `${gpu.clockCore} MHz` : 'N/A'} · ${gpu.clockMemory ? `${gpu.clockMemory} MHz` : 'N/A'}`} /><DataRow label="GPU utilization / temperature" value={`${gpu.utilizationGpu ?? 'N/A'}% · ${gpu.temperatureGpu != null ? `${gpu.temperatureGpu} °C` : 'N/A'}`} /></div>)}</DataPanel>}

    {visible === 'display' && <DataPanel title="Displays" icon="display">{hardware.display.length ? hardware.display.map((display, index) => <div key={`display-${index}`}><DataRow label={`Display ${index + 1}`} value={display.model || 'Model not reported'} /><DataRow label="Resolution" value={display.resolutionX && display.resolutionY ? `${display.resolutionX} × ${display.resolutionY}` : 'Not reported'} /><DataRow label="Refresh rate" value={display.currentRefreshRate ? `${display.currentRefreshRate} Hz` : 'Not reported'} /><DataRow label="Connection" value={display.connection} /></div>) : <DataRow label="Display information" value="Not reported by graphics driver" />}</DataPanel>}

    {visible === 'storage' && <div className="panel-grid"><DataPanel title="Physical storage" icon="chip">{storage.disks?.length ? storage.disks.map((disk, index) => <div key={`disk-${index}`}><DataRow label={`Drive ${index + 1}`} value={`${disk.vendor || ''} ${disk.name || disk.type || 'Storage device'}`} /><DataRow label="Media / interface" value={`${disk.type || 'N/A'} · ${disk.interfaceType || 'N/A'}`} /><DataRow label="Capacity / temperature" value={`${formatBytes(disk.size)} · ${disk.temperature != null ? `${disk.temperature} °C` : 'N/A'}`} /><DataRow label="Firmware / health" value={`${disk.firmwareRevision || 'N/A'} · ${disk.smartStatus || 'N/A'}`} /></div>) : <DataRow label="Drives" value="Not reported by the OS or storage driver" />}{(storage.devices || []).map((device, index) => <DataRow key={`device-${index}`} label={`Device ${index + 1}`} value={`${device.model || device.type || 'Storage device'} · ${formatBytes(device.size)}`} />)}</DataPanel><DataPanel title="Filesystem capacity" icon="chip">{storage.filesystems?.length ? storage.filesystems.map((filesystem, index) => <div key={`filesystem-${index}`}><DataRow label={`Volume ${index + 1}`} value={filesystem.type || 'Filesystem'} /><DataRow label="Used / available" value={`${formatBytes(filesystem.used)} / ${formatBytes(filesystem.available)}`} /><DataRow label="Capacity / utilization" value={`${formatBytes(filesystem.size)} · ${Number.isFinite(filesystem.use) ? `${filesystem.use.toFixed(1)}%` : 'N/A'}`} /></div>) : <DataRow label="Filesystems" value="Not reported" />}</DataPanel></div>}

    {visible === 'connectivity' && <div className="panel-grid"><DataPanel title="Network links" icon="wifi">{network.length ? network.map((item, index) => <div key={`network-${index}`}><DataRow label={`Adapter ${index + 1}`} value={`${item.type || 'Network'}${item.default ? ' · default route' : ''}`} /><DataRow label="Link state / speed" value={`${item.operstate || 'Unknown'} · ${item.speed ? `${item.speed} Mbps` : 'Not reported'}`} /><DataRow label="Duplex / MTU" value={`${item.duplex || 'N/A'} · ${item.mtu || 'N/A'}`} /></div>) : <DataRow label="Network links" value="No physical network links reported" />}<DataRow label="Aggregate receive" value={formatRate(sumRates(networkTraffic, 'rx_sec'))} /><DataRow label="Aggregate transmit" value={formatRate(sumRates(networkTraffic, 'tx_sec'))} /></DataPanel><DataPanel title="Link privacy" icon="lock"><div className="privacy-note"><Icon name="lock" size={16} /><span>IP and MAC addresses are excluded from this report.</span></div></DataPanel></div>}

    {visible === 'devices' && <div className="panel-grid">
      <DataPanel title="USB devices" icon="display">
        {usb.length ? usb.slice(0, 20).map((device, index) => <div key={`usb-${index}`}>
          <DataRow label={`USB device ${index + 1}`} value={device.name || device.type || 'Unknown device'} />
          <DataRow label="Manufacturer / bus" value={`${device.manufacturer || device.vendor || 'Not reported'} · ${device.bus || 'N/A'}`} />
          <DataRow label="Power / removable" value={`${device.maxPower || 'N/A'} · ${device.removable ? 'Yes' : 'No / unknown'}`} />
        </div>) : <DataRow label="USB devices" value="Not reported" />}
      </DataPanel>
      <DataPanel title="PCI devices & battery" icon="chip">
        {pci.length ? pci.slice(0, 20).map((device, index) => <div key={`pci-${index}`}>
          <DataRow label={`PCI device ${index + 1}`} value={`${device.vendorId || 'Vendor n/a'} · ${device.deviceId || 'Device n/a'}`} mono />
          <DataRow label="Class / subsystem" value={`${device.classCode || 'N/A'} · ${device.subsystemVendorId || 'N/A'}:${device.subsystemDeviceId || 'N/A'}`} mono />
        </div>) : <DataRow label="PCI inventory" value="Linux PCI sysfs information unavailable" />}
        <DataRow label="Battery" value={battery.hasBattery ? `${battery.percent ?? 'N/A'}%${battery.isCharging ? ' · charging' : ''}` : 'No battery reported'} />
        <DataRow label="Battery capacity" value={battery.hasBattery ? `${battery.currentCapacity ?? 'N/A'} / ${battery.maxCapacity ?? 'N/A'} ${battery.capacityUnit || ''}` : 'Not applicable'} />
        <DataRow label="Power source" value={battery.acConnected == null ? 'Not reported' : battery.acConnected ? 'AC connected' : 'Battery'} />
        <DataRow label="Estimated time remaining" value={battery.timeRemaining > 0 ? `${battery.timeRemaining} minutes` : 'Not reported'} />
      </DataPanel>
    </div>}
  </>;
}

function App() {
  const [hardware, setHardware] = useState(null);
  const [frequencyHistory, setFrequencyHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const visibleSections = window.deviceHardware
    ? sections
    : sections.filter(section => !['storage', 'devices'].includes(section.id));

  const refresh = async () => {
    setLoading(true);
    setHardware(await readHardware());
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    let reading = false;
    const poll = async () => {
      if (reading) return;
      reading = true;
      try {
        const nextHardware = await readHardware();
        if (mounted) setHardware(nextHardware);
      } finally {
        reading = false;
        if (mounted) setLoading(false);
      }
    };
    poll();
    const updateNetwork = () => setHardware(current => current ? { ...current, networkStatus: navigator.onLine ? 'Online' : 'Offline' } : current);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    const timer = window.deviceHardware ? window.setInterval(poll, 1000) : null;
    return () => {
      mounted = false;
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      if (timer) window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (hardware?.runtime !== 'desktop') return;
    const sample = {
      capturedAt: hardware.capturedAt,
      frequency: hardware.cpu.averageSpeedGhz,
    };
    if (!Number.isFinite(sample.frequency) || sample.frequency <= 0) return;

    setFrequencyHistory(current => {
      if (current[current.length - 1]?.capturedAt === sample.capturedAt) return current;
      return [...current, sample].slice(-61);
    });
  }, [hardware]);

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

  const visible = activeSection;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveSection('overview')} aria-label="Go Seek home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-name">GO SEEK<span> / SYSTEMS</span></span>
        </a>
        <div className="sidebar-label">DEVICE REPORT</div>
        <nav className="side-nav" aria-label="Report sections">
          {visibleSections.map(section => <button key={section.id} className={`nav-item ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}><Icon name={section.icon} /><span>{section.label}</span>{activeSection === section.id && <i />}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="live-dot" /> LOCAL SESSION<br /><strong>Data stays on this device</strong></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">DIAGNOSTICS <span>/</span> DEVICE PROFILE</div><div className="topbar-status"><span className="live-dot" /> {window.deviceHardware ? 'LIVE · 1 SECOND' : 'BROWSER SNAPSHOT'}</div></header>
        <div className="content-wrap">
          <div className="page-heading">
            <div><div className="eyebrow">HARDWARE & SYSTEM PROFILE <span>•</span> LIVE READOUT</div><h1>Your device,<br className="mobile-break" /> in detail.</h1><p className="subtitle">{window.deviceHardware ? 'Local operating-system hardware telemetry, refreshed every second.' : 'Browser-limited snapshot. Run the desktop app for host hardware details.'}</p></div>
            <div className="heading-actions"><button className="icon-button" onClick={copyReport} disabled={!hardware} title="Copy report JSON" aria-label="Copy report JSON"><Icon name={copied ? 'check' : 'copy'} /></button><button className="secondary-button" onClick={exportReport} disabled={!hardware}><Icon name="download" /> Export report</button><button className="primary-button" onClick={refresh} disabled={loading}><Icon name="refresh" /> {loading ? 'Reading…' : 'Refresh'}</button></div>
          </div>

          {!window.deviceHardware && <div className="notice-bar"><span className="notice-symbol">i</span><p><strong>Browser-limited report.</strong> Exact CPU model, installed RAM, disk inventory, serial numbers, and sensors are restricted to native system tools. Launch the desktop build to read the computer running this app.</p><button onClick={() => setActiveSection('environment')}>ABOUT ACCESS <span>↗</span></button></div>}

          {hardware && <>
            <div className="snapshot-line"><span><span className="live-dot" /> CAPTURED {hardware.updatedAt.toLocaleTimeString()}</span><span>COLLECTION SOURCE <strong>{hardware.runtime === 'desktop' ? `${hardware.operatingSystem} · LOCAL HOST` : 'WEB PLATFORM APIs'}</strong></span></div>
            {hardware.runtime === 'desktop' && visible === 'overview' && <OverviewDashboard hardware={hardware} frequencyHistory={frequencyHistory} />}
            {hardware.runtime === 'desktop' && visible !== 'overview' && <DesktopHardwareDetails hardware={hardware} visible={visible} frequencyHistory={frequencyHistory} />}

            {hardware.runtime === 'desktop' && visible === 'compute' && <>
              {visible === 'compute' && <div className="metric-strip">
                <div className="metric"><span className="metric-label">PROCESSOR CORES</span><strong>{hardware.cpu.logicalCores}</strong><span className="metric-foot">{hardware.cpu.physicalCores || 'N/A'} PHYSICAL CORES</span><span className="metric-glyph">01</span></div>
                <div className="metric"><span className="metric-label">SYSTEM MEMORY</span><strong>{formatBytes(hardware.memory.totalBytes)}</strong><span className="metric-foot">OS-REPORTED INSTALLED RAM</span><span className="metric-glyph">02</span></div>
                <div className="metric"><span className="metric-label">CPU SPEED · CURRENT</span><strong className="metric-resolution">{hardware.cpu.averageSpeedGhz ? `${hardware.cpu.averageSpeedGhz.toFixed(2)} GHz` : 'N/A'}</strong><span className="metric-foot">LIVE AVERAGE</span><span className="metric-glyph">03</span></div>
                <div className="metric"><span className="metric-label">GRAPHICS ADAPTERS</span><strong className="metric-online">{hardware.graphics.length}</strong><span className="metric-foot">DETECTED CONTROLLERS</span><span className="metric-glyph">04</span></div>
              </div>}
              <div className="panel-grid">
                <DataPanel title="Processor & live clocks" icon="chip"><DataRow label="SoC / CPU" value={hardware.soc.name} /><DataRow label="Vendor" value={hardware.soc.manufacturer} /><DataRow label="Family / model" value={`${hardware.soc.family} / ${hardware.soc.model}`} /><DataRow label="Architecture" value={hardware.cpu.architecture} /><DataRow label="Max rated frequency" value={hardware.cpu.maxSpeedGhz ? `${hardware.cpu.maxSpeedGhz} GHz` : 'Not reported'} /><DataRow label="Current per-core frequency" value={hardware.cpu.current.length ? hardware.cpu.current.map((speed, index) => `C${index} ${speed} GHz`).join(' · ') : 'Per-core readings unavailable'} /><DataRow label="Hybrid core counts" value={`${hardware.cpu.performanceCores ?? 'N/A'} performance · ${hardware.cpu.efficiencyCores ?? 'N/A'} efficiency`} /></DataPanel>
                <DataPanel title="GPU & caches" icon="display">{hardware.graphics.length ? hardware.graphics.map((gpu, index) => <div key={`${gpu.model}-${index}`}><DataRow label={`GPU ${index + 1}`} value={`${gpu.vendor || ''} ${gpu.model || gpu.name || 'Unknown model'}`} /><DataRow label="VRAM" value={gpu.vram ? `${gpu.vram} MB` : 'Shared / unavailable'} /><DataRow label="GPU clock" value={gpu.clockCore ? `${gpu.clockCore} MHz` : 'Driver does not report'} /></div>) : <DataRow label="Graphics" value="No controller details reported" />}<DataRow label="L1 data / instruction" value={`${formatBytes(hardware.cpu.caches.l1d)} / ${formatBytes(hardware.cpu.caches.l1i)}`} /><DataRow label="L2 cache" value={formatBytes(hardware.cpu.caches.l2)} /><DataRow label="L3 cache" value={formatBytes(hardware.cpu.caches.l3)} /><DataRow label="CPU temperature" value={hardware.cpu.temperatureC != null ? `${hardware.cpu.temperatureC} °C` : 'Sensor unavailable'} /></DataPanel>
              </div>
            </>}

            {hardware.runtime === 'desktop' && visible === 'memory' && <DataPanel title="Memory modules" icon="chip"><DataRow label="Total physical memory" value={formatBytes(hardware.memory.totalBytes)} /><DataRow label="Available to OS" value={formatBytes(hardware.memory.availableBytes)} />{hardware.memory.modules.length ? hardware.memory.modules.map((module, index) => <div key={`${module.bank || module.partNum}-${index}`}><DataRow label={`Module ${index + 1}`} value={`${formatBytes(module.size)} ${module.type || 'memory'}`} /><DataRow label="Speed / form factor" value={`${module.clockSpeed || 'N/A'} MHz · ${module.formFactor || 'N/A'}`} /><DataRow label="Manufacturer / part" value={`${module.manufacturer || 'N/A'} · ${module.partNum || 'N/A'}`} mono /></div>) : <DataRow label="Module layout" value="Not exposed by this OS or permission level" />}</DataPanel>}

            {hardware.runtime === 'desktop' && visible === 'board' && <div className="panel-grid"><DataPanel title="System & mainboard" icon="display"><DataRow label="System manufacturer" value={hardware.system.manufacturer} /><DataRow label="System model" value={hardware.system.model} /><DataRow label="Mainboard manufacturer" value={hardware.mainboard.manufacturer} /><DataRow label="Mainboard model" value={hardware.mainboard.model} /><DataRow label="Board version" value={hardware.mainboard.version} /><DataRow label="Virtual machine" value={hardware.system.virtual ? `Yes · ${hardware.system.virtualHost || 'host unknown'}` : 'No / unknown'} /></DataPanel><DataPanel title="BIOS / firmware" icon="chip"><DataRow label="Vendor" value={hardware.bios.vendor} /><DataRow label="Version" value={hardware.bios.version} /><DataRow label="Release date" value={hardware.bios.releaseDate} /><DataRow label="Revision" value={hardware.bios.revision} /><DataRow label="SoC process node" value={hardware.soc.processNode} /></DataPanel></div>}

            {hardware.runtime !== 'desktop' && (visible === 'overview' || visible === 'display') && <div className="panel-grid">
              <DataPanel title="Display & viewport" icon="display"><DataRow label="Screen resolution" value={hardware.screen} /><DataRow label="Available area" value={hardware.availableScreen} /><DataRow label="Browser viewport" value={hardware.viewport} /><DataRow label="Pixel density" value={hardware.pixelRatio} /><DataRow label="Color depth" value={hardware.colorDepth} /><DataRow label="Orientation" value={hardware.orientation} /></DataPanel>
              {visible === 'display' && <DataPanel title="Input capabilities" icon="chip"><DataRow label="Touch points" value={hardware.touchPoints} /><DataRow label="Pointer capabilities" value={window.matchMedia('(pointer: coarse)').matches ? 'Coarse pointer available' : 'Fine pointer available'} /><DataRow label="Reduced motion" value={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Not enabled'} /></DataPanel>}
            </div>}

            {hardware.runtime !== 'desktop' && (visible === 'overview' || visible === 'connectivity') && <div className="panel-grid">
              <DataPanel title="Network connection" icon="wifi"><DataRow label="Connection" value={hardware.networkStatus} /><DataRow label="Effective type" value={hardware.networkType} /><DataRow label="Estimated downlink" value={hardware.downlink} /><DataRow label="Round-trip latency" value={hardware.latency} /><DataRow label="Data saver" value={hardware.dataSaver} /></DataPanel>
              {visible === 'connectivity' && <DataPanel title="Power & storage" icon="chip"><DataRow label="Battery" value={hardware.battery} /><DataRow label="Site storage" value={hardware.storage} /><DataRow label="Storage scope" value="This website only" /></DataPanel>}
            </div>}

            {hardware.runtime !== 'desktop' && (visible === 'overview' || visible === 'environment') && <div className="panel-grid">
              <DataPanel title="Browser environment" icon="globe"><DataRow label="Browser" value={hardware.browser} /><DataRow label="Browser version" value={hardware.browserVersion} /><DataRow label="Operating system" value={hardware.operatingSystem} /><DataRow label="Preferred language" value={hardware.language} /><DataRow label="Time zone" value={hardware.timezone} /><DataRow label="Cookies" value={hardware.cookies} /></DataPanel>
              {visible === 'environment' && <DataPanel title="Privacy & access" icon="lock"><DataRow label="Battery status" value={hardware.battery} /><DataRow label="Site storage" value={hardware.storage} /><DataRow label="Language preferences" value={hardware.languages} /><DataRow label="User agent" value={hardware.userAgent} mono /><div className="privacy-note"><Icon name="lock" size={16} /><span>Nothing is sent to a server. Values are read locally by your browser.</span></div></DataPanel>}
            </div>}
          </>}
          {loading && !hardware && <div className="loading-state"><span className="loader" /> Reading available device information…</div>}
          <footer className="page-footer"><span>GO SEEK SYSTEMS <span className="footer-divider">/</span> DEVICE REPORT</span><span>LOCAL READOUT · NO DATA UPLOAD</span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
