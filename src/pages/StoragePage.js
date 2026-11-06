import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes } from '../lib/formatters';

export default function StoragePage() {
  const { hardware } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Storage" icon="chip"><DataRow label="Access" value="Physical storage details require the desktop app." /></DataPanel>;

  const storage = hardware.storage || {};
  return <div className="panel-grid">
    <DataPanel title="Physical storage" icon="chip">
      {storage.disks?.length ? storage.disks.map((disk, index) => <div key={`disk-${index}`}>
        <DataRow label={`Drive ${index + 1}`} value={`${disk.vendor || ''} ${disk.name || disk.type || 'Storage device'}`} />
        <DataRow label="Media / interface" value={`${disk.type || 'N/A'} · ${disk.interfaceType || 'N/A'}`} />
        <DataRow label="Capacity / temperature" value={`${formatBytes(disk.size)} · ${disk.temperature != null ? `${disk.temperature} °C` : 'N/A'}`} />
        <DataRow label="Firmware / health" value={`${disk.firmwareRevision || 'N/A'} · ${disk.smartStatus || 'N/A'}`} />
      </div>) : <DataRow label="Drives" value="Not reported by the OS or storage driver" />}
      {(storage.devices || []).map((device, index) => <DataRow key={`device-${index}`} label={`Device ${index + 1}`} value={`${device.model || device.type || 'Storage device'} · ${formatBytes(device.size)}`} />)}
    </DataPanel>
    <DataPanel title="Filesystem capacity" icon="chip">
      {storage.filesystems?.length ? storage.filesystems.map((filesystem, index) => <div key={`filesystem-${index}`}>
        <DataRow label={`Volume ${index + 1}`} value={filesystem.type || 'Filesystem'} />
        <DataRow label="Used / available" value={`${formatBytes(filesystem.used)} / ${formatBytes(filesystem.available)}`} />
        <DataRow label="Capacity / utilization" value={`${formatBytes(filesystem.size)} · ${Number.isFinite(filesystem.use) ? `${filesystem.use.toFixed(1)}%` : 'N/A'}`} />
      </div>) : <DataRow label="Filesystems" value="Not reported" />}
    </DataPanel>
  </div>;
}