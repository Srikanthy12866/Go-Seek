import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatCapacity } from '../lib/formatters';

export default function BoardPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Board & BIOS" icon="display"><DataRow label="Access" value="Board and firmware details require the desktop app." /></DataPanel>;

  return <div className="panel-grid">
    <DataPanel title="System & mainboard" icon="display">
      <DataRow label="System manufacturer / model" value={`${hardware.system.manufacturer || 'Not reported'} · ${hardware.system.model || 'Not reported'}`} />
      <DataRow label="Mainboard manufacturer / model" value={`${hardware.mainboard.manufacturer || 'Not reported'} · ${hardware.mainboard.model || 'Not reported'}`} />
      <DataRow label="Board version" value={hardware.mainboard.version} />
      <DataRow label="Maximum memory / slots" value={`${formatCapacity(hardware.mainboard.memMax)} · ${hardware.mainboard.memSlots ?? 'Not reported'}`} />
      <DataRow label="PCI host bridge IDs" value={hardware.mainboard.hostBridges?.length ? hardware.mainboard.hostBridges.map(device => `${device.vendorId || 'N/A'}:${device.deviceId || 'N/A'}`).join(' · ') : 'Not reported by Linux PCI sysfs'} mono />
      <DataRow label="Chipset / southbridge name" value="Not exposed by standard Linux hardware APIs" />
      <DataRow label="LPCIO controller details" value="Not exposed by standard Linux hardware APIs" />
      <DataRow label="Virtual machine" value={hardware.system.virtual ? `Yes · ${hardware.system.virtualHost || 'host unknown'}` : 'No / unknown'} />
    </DataPanel>
    <DataPanel title="BIOS / firmware" icon="chip">
      <DataRow label="Vendor" value={hardware.bios.vendor} />
      <DataRow label="Version / revision" value={`${hardware.bios.version || 'Not reported'} · ${hardware.bios.revision || 'Not reported'}`} />
      <DataRow label="Release date / language" value={`${hardware.bios.releaseDate || 'Not reported'} · ${hardware.bios.language || 'Not reported'}`} />
      <DataRow label="Boot mode" value={hardware.bios.bootMode} />
    </DataPanel>
    <DataPanel title="Graphics interface" icon="display">
      {hardware.graphics.length ? hardware.graphics.map((gpu, index) => <div key={`gpu-interface-${index}`}>
        <DataRow label={`GPU ${index + 1} bus`} value={`${gpu.bus || 'Not reported'} · ${gpu.busAddress || 'Address not reported'}`} mono />
        <DataRow label="Current PCIe link" value={gpu.pciLink?.currentSpeed && gpu.pciLink?.currentWidth ? `${gpu.pciLink.currentSpeed} · x${gpu.pciLink.currentWidth}` : 'Not exposed by driver/sysfs'} />
        <DataRow label="Maximum PCIe link" value={gpu.pciLink?.maxSpeed && gpu.pciLink?.maxWidth ? `${gpu.pciLink.maxSpeed} · x${gpu.pciLink.maxWidth}` : 'Not exposed by driver/sysfs'} />
      </div>) : <DataRow label="Graphics interface" value="Not reported" />}
    </DataPanel>
  </div>;
}