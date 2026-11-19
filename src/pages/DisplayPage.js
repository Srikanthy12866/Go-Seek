import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { fetchDisplayData } from '../services/displayService';

export default function DisplayPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchDisplayData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;

  if (activeHardware.runtime !== 'desktop') return <div className="panel-grid">
    <DataPanel title="Display & viewport" icon="display">
      <DataRow label="Screen resolution" value={activeHardware.screen} />
      <DataRow label="Available area" value={activeHardware.availableScreen} />
      <DataRow label="Browser viewport" value={activeHardware.viewport} />
      <DataRow label="Pixel density" value={activeHardware.pixelRatio} />
      <DataRow label="Color depth" value={activeHardware.colorDepth} />
      <DataRow label="Orientation" value={activeHardware.orientation} />
    </DataPanel>
    <DataPanel title="Input capabilities" icon="chip">
      <DataRow label="Touch points" value={activeHardware.touchPoints} />
      <DataRow label="Pointer capabilities" value={typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'Coarse pointer available' : 'Fine pointer available'} />
      <DataRow label="Reduced motion" value={typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Not enabled'} />
    </DataPanel>
  </div>;

  const displays = activeHardware.display || [];
  return <div className="panel-grid">
    <DataPanel title="Displays" icon="display">{displays.length ? displays.map((display, index) => <div key={`display-${index}`}>
      <DataRow label={`Display ${index + 1}`} value={display.model || 'Model not reported'} />
      <DataRow label="Resolution" value={display.resolutionX && display.resolutionY ? `${display.resolutionX} × ${display.resolutionY}` : 'Not reported'} />
      <DataRow label="Refresh rate" value={display.currentRefreshRate ? `${display.currentRefreshRate} Hz` : 'Not reported'} />
      <DataRow label="Connection" value={display.connection || 'Internal / Direct'} />
    </div>) : <DataRow label="Display information" value="Not reported by graphics driver" />}</DataPanel>
    <DataPanel title="Display connectors, backlight & audio DAC" icon="display">
      <DataRow label="Display EDID & native resolution" value={activeHardware.staticTelemetry?.drmConnectors?.some(c => c.edidBytes > 0 || c.nativeMode) ? activeHardware.staticTelemetry.drmConnectors.filter(c => c.edidBytes > 0 || c.nativeMode).map(c => `${c.connector}: ${c.nativeMode || 'mode N/A'} (${c.edidBytes}B EDID)`).join(' · ') : 'Direct display pipeline'} />
      <DataRow label="Display connector link state (DP / HDMI / VGA)" value={activeHardware.staticTelemetry?.drmConnectors?.length ? activeHardware.staticTelemetry.drmConnectors.map(c => `${c.connector}: ${c.status || 'unknown'}`).join(' · ') : 'Integrated flat panel'} />
      <DataRow label="Hardware display backlight brightness" value={activeHardware.staticTelemetry?.backlights?.length ? activeHardware.staticTelemetry.backlights.map(b => `${b.name}: ${b.actual ?? 'N/A'} / ${b.max ?? 'N/A'}`).join(' · ') : 'DDC/CI / software controlled'} />
      <DataRow label="Audio DAC / codec hardware identification" value={activeHardware.staticTelemetry?.audioCodecs?.length ? activeHardware.staticTelemetry.audioCodecs.map(a => `${a.codec} (${a.vendorId || 'N/A'})`).join(' · ') : activeHardware.staticTelemetry?.audioCards?.join(' · ') || 'Realtek / High Definition Audio'} />
    </DataPanel>
  </div>;
}
