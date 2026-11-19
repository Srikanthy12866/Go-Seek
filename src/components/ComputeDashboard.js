import { useState } from 'react';
import { DataPanel } from './HardwareUI';
import { formatFrequency, formatPercent } from '../lib/formatters';

export default function ComputeDashboard({ hardware, history = [], compact = false }) {
  const [chartMode, setChartMode] = useState('utilization'); // 'utilization' (Task Manager waveform) | 'frequency'
  const cpu = hardware.cpu;
  const frequencies = cpu.current || [];
  const utilization = cpu.perCoreUtilizationPercent || [];
  const isUtil = chartMode === 'utilization';

  // For frequency chart, filter positive samples
  const samples = history.filter(sample => sample && Number.isFinite(sample.capturedAt));
  const maxFrequency = Math.max(cpu.maxSpeedGhz || 0, ...frequencies.filter(Number.isFinite), ...samples.map(sample => sample.frequency || 0), 1);

  const points = samples.map((sample, index) => {
    const x = samples.length === 1 ? 250 : 12 + (index / (samples.length - 1)) * 476;
    const val = isUtil
      ? Math.max(0, Math.min(Number.isFinite(sample.utilization) ? sample.utilization : 0, 100))
      : (Number.isFinite(sample.frequency) ? sample.frequency : 0);
    const maxVal = isUtil ? 100 : maxFrequency;
    const y = 104 - (val / (maxVal || 1)) * 84;
    return `${x},${y}`;
  }).join(' ');

  const areaPolygon = samples.length > 1
    ? `12,104 ${points} 488,104`
    : samples.length === 1
      ? `240,104 ${points} 260,104`
      : '';

  const lastSample = samples[samples.length - 1];
  const lastVal = lastSample
    ? (isUtil ? (lastSample.utilization ?? 0) : (lastSample.frequency ?? 0))
    : (isUtil ? (cpu.utilizationPercent ?? 0) : (cpu.averageSpeedGhz ?? 0));
  const lastMax = isUtil ? 100 : maxFrequency;
  const lastDotX = samples.length <= 1 ? 250 : 488;
  const lastDotY = 104 - ((lastVal || 0) / (lastMax || 1)) * 84;

  const strokeColor = isUtil ? '#10b981' : '#38bdf8';
  const gradientId = isUtil ? 'util-gradient' : 'freq-gradient';

  return (
    <DataPanel title="CPU frequency & utilization" icon="chip">
      <div className="compute-dashboard">
        <div className="compute-metrics">
          <div><span>Average clock</span><strong>{formatFrequency(cpu.averageSpeedGhz)}</strong></div>
          <div><span>CPU utilization</span><strong>{formatPercent(cpu.utilizationPercent)}</strong></div>
          <div><span>Rated maximum</span><strong>{formatFrequency(cpu.maxSpeedGhz)}</strong></div>
        </div>
        <div className="frequency-chart">
          <div className="frequency-chart-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{isUtil ? 'CPU % Utilization Trend' : 'Average Clock Trend'}</strong>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>Last 60 seconds</span>
            </div>
            <div className="chart-mode-toggle">
              <button
                type="button"
                className={`chart-mode-btn ${isUtil ? 'active' : ''}`}
                onClick={() => setChartMode('utilization')}
              >
                % Utilization (Task Manager)
              </button>
              <button
                type="button"
                className={`chart-mode-btn ${!isUtil ? 'active' : ''}`}
                onClick={() => setChartMode('frequency')}
              >
                Clock Speed (GHz)
              </button>
            </div>
          </div>
          {samples.length ? (
            <svg role="img" aria-label="CPU average frequency trend over the last minute" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="util-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="80%" stopColor="#10b981" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="freq-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line className="frequency-gridline" x1="8" x2="492" y1="20" y2="20" />
              <line className="frequency-gridline" x1="8" x2="492" y1="41" y2="41" />
              <line className="frequency-gridline" x1="8" x2="492" y1="62" y2="62" />
              <line className="frequency-gridline" x1="8" x2="492" y1="83" y2="83" />
              <line className="frequency-gridline" x1="8" x2="492" y1="104" y2="104" />
              {areaPolygon && <polygon points={areaPolygon} fill={`url(#${gradientId})`} />}
              {samples.length > 1 && (
                <polyline
                  className="frequency-trend-line"
                  style={{ stroke: strokeColor }}
                  points={points}
                />
              )}
              <circle
                className="frequency-trend-dot"
                style={{ fill: strokeColor, filter: `drop-shadow(0 0 6px ${strokeColor})` }}
                cx={lastDotX}
                cy={lastDotY}
                r="4.5"
              />
            </svg>
          ) : (
            <div className="frequency-chart-empty">Waiting for valid telemetry samples</div>
          )}
          <div className="frequency-chart-axis">
            <span>60s ago</span>
            <span>{isUtil ? 'Waveform (0 - 100%)' : `Dynamic clock (up to ${maxFrequency.toFixed(2)} GHz)`}</span>
            <span>Now</span>
          </div>
        </div>
        {!compact && (
          <div className="core-readings" aria-label="Per-core frequency and utilization">
            {frequencies.length ? (
              frequencies.map((frequency, index) => {
                const frequencyPercent = Number.isFinite(frequency) ? Math.min((frequency / maxFrequency) * 100, 100) : 0;
                const coreLoad = utilization[index];
                const loadPercent = Number.isFinite(coreLoad) ? Math.max(0, Math.min(coreLoad, 100)) : 0;
                return (
                  <div className="core-reading" key={`core-${index}`}>
                    <div className="core-reading-heading">
                      <span>Core {index}</span>
                      <strong>{formatFrequency(frequency)}</strong>
                      <span>{formatPercent(coreLoad)}</span>
                    </div>
                    <div
                      className="frequency-track"
                      role="meter"
                      aria-label={`Core ${index} frequency`}
                      aria-valuemin="0"
                      aria-valuemax={maxFrequency}
                      aria-valuenow={Number.isFinite(frequency) ? frequency : 0}
                    >
                      <span style={{ width: `${frequencyPercent}%` }} />
                    </div>
                    <div
                      className="utilization-track"
                      role="meter"
                      aria-label={`Core ${index} utilization`}
                      aria-valuemin="0"
                      aria-valuemax={100}
                      aria-valuenow={loadPercent}
                    >
                      <span style={{ width: `${loadPercent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="frequency-chart-empty">Per-core frequency readings are unavailable</p>
            )}
          </div>
        )}
        {!compact && (hardware.graphics || []).length > 0 && (
          <div className="gpu-readings">
            <div className="frequency-chart-heading">
              <strong>GPU clocks & activity</strong>
              <span>Driver reported</span>
            </div>
            {hardware.graphics.map((gpu, index) => {
              const gpuLoad = Number.isFinite(gpu.utilizationGpu) ? Math.max(0, Math.min(gpu.utilizationGpu, 100)) : 0;
              return (
                <div className="gpu-reading" key={`gpu-${index}`}>
                  <div className="gpu-reading-heading">
                    <span>{gpu.model || gpu.name || `GPU ${index + 1}`}</span>
                    <strong>{formatPercent(gpu.utilizationGpu)}</strong>
                  </div>
                  <div className="gpu-reading-metrics">
                    <span>Core {Number.isFinite(gpu.clockCore) && gpu.clockCore > 0 ? `${gpu.clockCore} MHz` : 'N/A'}</span>
                    <span>Memory {Number.isFinite(gpu.clockMemory) && gpu.clockMemory > 0 ? `${gpu.clockMemory} MHz` : 'N/A'}</span>
                    <span>{Number.isFinite(gpu.temperatureGpu) ? `${gpu.temperatureGpu} °C` : 'N/A'}</span>
                  </div>
                  <div
                    className="utilization-track"
                    role="meter"
                    aria-label={`Graphics processor ${index + 1} utilization`}
                    aria-valuemin="0"
                    aria-valuemax={100}
                    aria-valuenow={gpuLoad}
                  >
                    <span style={{ width: `${gpuLoad}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DataPanel>
  );
}
