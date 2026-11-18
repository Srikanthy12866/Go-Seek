import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';

export default function DisplayPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;

  if (hardware.runtime !== 'desktop') return <div className="panel-grid">
    <DataPanel title="Display & viewport" icon="display">
      <DataRow label="Screen resolution" value={hardware.screen} />
      <DataRow label="Available area" value={hardware.availableScreen} />
      <DataRow label="Browser viewport" value={hardware.viewport} />
      <DataRow label="Pixel density" value={hardware.pixelRatio} />
      <DataRow label="Color depth" value={hardware.colorDepth} />
      <DataRow label="Orientation" value={hardware.orientation} />
    </DataPanel>
    <DataPanel title="Input capabilities" icon="chip">
      <DataRow label="Touch points" value={hardware.touchPoints} />
      <DataRow label="Pointer capabilities" value={window.matchMedia('(pointer: coarse)').matches ? 'Coarse pointer available' : 'Fine pointer available'} />
      <DataRow label="Reduced motion" value={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Not enabled'} />
    </DataPanel>
  </div>;

  return <div className="panel-grid">
    <DataPanel title="Displays" icon="display">{hardware.display.length ? hardware.display.map((display, index) => <div key={`display-${index}`}>
      <DataRow label={`Display ${index + 1}`} value={display.model || 'Model not reported'} />
      <DataRow label="Resolution" value={display.resolutionX && display.resolutionY ? `${display.resolutionX} × ${display.resolutionY}` : 'Not reported'} />
      <DataRow label="Refresh rate" value={display.currentRefreshRate ? `${display.currentRefreshRate} Hz` : 'Not reported'} />
      <DataRow label="Connection" value={display.connection} />
    </div>) : <DataRow label="Display information" value="Not reported by graphics driver" />}</DataPanel>
    <DataPanel title="Display connectors, backlight & audio DAC" icon="display">
      <DataRow label="Display EDID & native resolution" value={hardware.staticTelemetry?.drmConnectors?.some(c => c.edidBytes > 0 || c.nativeMode) ? hardware.staticTelemetry.drmConnectors.filter(c => c.edidBytes > 0 || c.nativeMode).map(c => `${c.connector}: ${c.nativeMode || 'mode N/A'} (${c.edidBytes}B EDID)`).join(' · ') : 'No EDID block exposed by DRM'} />
      <DataRow label="Display connector link state (DP / HDMI / VGA)" value={hardware.staticTelemetry?.drmConnectors?.length ? hardware.staticTelemetry.drmConnectors.map(c => `${c.connector}: ${c.status || 'unknown'}`).join(' · ') : 'Not reported'} />
      <DataRow label="Hardware display backlight brightness" value={hardware.staticTelemetry?.backlights?.length ? hardware.staticTelemetry.backlights.map(b => `${b.name}: ${b.actual ?? 'N/A'} / ${b.max ?? 'N/A'}`).join(' · ') : 'External monitor / no PWM backlight in /sys/class/backlight'} />
      <DataRow label="Audio DAC / codec hardware identification" value={hardware.staticTelemetry?.audioCodecs?.length ? hardware.staticTelemetry.audioCodecs.map(a => `${a.codec} (${a.vendorId || 'N/A'})`).join(' · ') : hardware.staticTelemetry?.audioCards?.join(' · ') || 'Not reported'} />
    </DataPanel>
  </div>;
}