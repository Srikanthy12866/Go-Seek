import { DataPanel } from './HardwareUI';
import { formatFrequency, formatPercent } from '../lib/formatters';

export default function ComputeDashboard({ hardware, history = [], compact = false }) {
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