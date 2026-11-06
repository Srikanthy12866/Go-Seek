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

  return <DataPanel title="Displays" icon="display">{hardware.display.length ? hardware.display.map((display, index) => <div key={`display-${index}`}>
    <DataRow label={`Display ${index + 1}`} value={display.model || 'Model not reported'} />
    <DataRow label="Resolution" value={display.resolutionX && display.resolutionY ? `${display.resolutionX} × ${display.resolutionY}` : 'Not reported'} />
    <DataRow label="Refresh rate" value={display.currentRefreshRate ? `${display.currentRefreshRate} Hz` : 'Not reported'} />
    <DataRow label="Connection" value={display.connection} />
  </div>) : <DataRow label="Display information" value="Not reported by graphics driver" />}</DataPanel>;
}