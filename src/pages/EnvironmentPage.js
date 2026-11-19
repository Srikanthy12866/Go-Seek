import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { fetchEnvironmentData } from '../services/environmentService';

export default function EnvironmentPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchEnvironmentData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;

  if (activeHardware.runtime === 'desktop') return <div className="panel-grid">
    <DataPanel title="Operating environment" icon="globe">
      <DataRow label="Operating system" value={activeHardware.operatingSystem} />
      <DataRow label="Platform / architecture" value={`${activeHardware.platform} · ${activeHardware.architecture}`} />
      <DataRow label="Collection source" value="Local Electron host APIs" />
      <DataRow label="Privacy" value="Hardware data remains on this device unless you export or copy the report." />
    </DataPanel>
  </div>;

  return <div className="panel-grid">
    <DataPanel title="Browser environment" icon="globe">
      <DataRow label="Browser" value={activeHardware.browser} />
      <DataRow label="Browser version" value={activeHardware.browserVersion} />
      <DataRow label="Operating system" value={activeHardware.operatingSystem} />
      <DataRow label="Preferred language" value={activeHardware.language} />
      <DataRow label="Time zone" value={activeHardware.timezone} />
      <DataRow label="Cookies" value={activeHardware.cookies} />
    </DataPanel>
    <DataPanel title="Privacy & access" icon="lock">
      <DataRow label="Battery status" value={activeHardware.battery} />
      <DataRow label="Site storage" value={activeHardware.storage} />
      <DataRow label="Language preferences" value={activeHardware.languages} />
      <DataRow label="User agent" value={activeHardware.userAgent} mono />
      <div className="privacy-note"><span>Nothing is sent to a server. Values are read locally by your browser.</span></div>
    </DataPanel>
  </div>;
}
