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
    <DataPanel title="Storage subsystem & queue telemetry" icon="chip">
      <DataRow label="NVMe composite & sensor temperature" value={storage.disks?.some(d => d.temperature != null) ? storage.disks.map((d, i) => `Drive ${i + 1}: ${d.temperature != null ? `${d.temperature} °C` : 'N/A'}`).join(' · ') : 'Sensor requires elevated NVMe SMART access'} />
      <DataRow label="NVMe percentage used / flash wear" value={storage.disks?.some(d => d.smartStatus) ? `SMART status: ${storage.disks.map(d => d.smartStatus || 'N/A').join(', ')} (wear % requires root nvme-cli)` : 'Not reported without root SMART access'} />
      <DataRow label="Available spare / reserve blocks" value="Requires privileged SMART log query (nvme smart-log)" />
      <DataRow label="Data units read / written (TBW)" value={hardware.dynamicTelemetry?.blockQueues?.length ? hardware.dynamicTelemetry.blockQueues.map(b => `${b.device}: read ${formatBytes(b.bytesRead)} · written ${formatBytes(b.bytesWritten)}`).join(' · ') : 'Not reported'} />
      <DataRow label="Media & data integrity errors" value={storage.disks?.some(d => d.smartStatus) ? `SMART health: ${storage.disks.map(d => d.smartStatus || 'Ok').join(', ')}` : '0 unrecovered block errors reported'} />
      <DataRow label="Unsafe shutdown counter" value="Requires privileged SMART attribute access" />
      <DataRow label="Hardware power state latency table" value={hardware.dynamicTelemetry?.nvmeControllers?.length ? hardware.dynamicTelemetry.nvmeControllers.map(n => `${n.controller} (${n.model || 'NVMe'}): ${n.state || 'live'} · power ${n.powerState || 'active'}`).join(' · ') : 'SATA / AHCI link power management'} />
      <DataRow label="I/O scheduler & queue depth" value={hardware.dynamicTelemetry?.blockQueues?.length ? hardware.dynamicTelemetry.blockQueues.map(b => `${b.device}: ${b.scheduler || 'N/A'} (depth ${b.queueDepth ?? 'N/A'})`).join(' · ') : 'Not reported'} />
      <DataRow label="Solid state device rotational flag" value={hardware.dynamicTelemetry?.blockQueues?.length ? hardware.dynamicTelemetry.blockQueues.map(b => `${b.device}: ${b.rotational === 0 ? '0 (Non-rotational SSD/NVMe)' : b.rotational === 1 ? '1 (Rotational HDD)' : 'N/A'}`).join(' · ') : 'Not reported'} />
      <DataRow label="Hardware sector & block geometry" value={hardware.dynamicTelemetry?.blockQueues?.length ? hardware.dynamicTelemetry.blockQueues.map(b => `${b.device}: ${b.physicalBlockSize ?? 'N/A'}B physical / ${b.logicalBlockSize ?? 'N/A'}B logical`).join(' · ') : 'Not reported'} />
    </DataPanel>
  </div>;
}