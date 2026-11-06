import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';

export default function EnvironmentPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;

  if (hardware.runtime === 'desktop') return <div className="panel-grid">
    <DataPanel title="Operating environment" icon="globe">
      <DataRow label="Operating system" value={hardware.operatingSystem} />
      <DataRow label="Platform / architecture" value={`${hardware.platform} · ${hardware.architecture}`} />
      <DataRow label="Collection source" value="Local Electron host APIs" />
      <DataRow label="Privacy" value="Hardware data remains on this device unless you export or copy the report." />
    </DataPanel>
  </div>;

  return <div className="panel-grid">
    <DataPanel title="Browser environment" icon="globe">
      <DataRow label="Browser" value={hardware.browser} />
      <DataRow label="Browser version" value={hardware.browserVersion} />
      <DataRow label="Operating system" value={hardware.operatingSystem} />
      <DataRow label="Preferred language" value={hardware.language} />
      <DataRow label="Time zone" value={hardware.timezone} />
      <DataRow label="Cookies" value={hardware.cookies} />
    </DataPanel>
    <DataPanel title="Privacy & access" icon="lock">
      <DataRow label="Battery status" value={hardware.battery} />
      <DataRow label="Site storage" value={hardware.storage} />
      <DataRow label="Language preferences" value={hardware.languages} />
      <DataRow label="User agent" value={hardware.userAgent} mono />
      <div className="privacy-note"><span>Nothing is sent to a server. Values are read locally by your browser.</span></div>
    </DataPanel>
  </div>;
}