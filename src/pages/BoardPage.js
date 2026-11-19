import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatCapacity, formatOptional } from '../lib/formatters';

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
      <DataRow label="PCI host bridge IDs" value={hardware.mainboard.hostBridges?.length ? hardware.mainboard.hostBridges.map(device => `${device.vendorId || 'N/A'}:${device.deviceId || 'N/A'}`).join(' · ') : 'Not reported by OS hardware APIs'} mono />
      <DataRow label="Chipset" value={formatOptional(hardware.mainboard.chipset)} />
      <DataRow label="Southbridge" value={formatOptional(hardware.mainboard.southbridge)} />
      <DataRow label="LPCIO controller" value={formatOptional(hardware.mainboard.lpcio)} />
      <DataRow label="Virtual machine" value={hardware.system.virtual ? `Yes · ${hardware.system.virtualHost || 'host unknown'}` : 'No / unknown'} />
    </DataPanel>
    <DataPanel title="BIOS / firmware" icon="chip">
      <DataRow label="Vendor" value={hardware.bios.vendor} />
      <DataRow label="Version / revision" value={`${hardware.bios.version || 'Not reported'} · ${hardware.bios.revision || 'Not reported'}`} />
      <DataRow label="Release date / language" value={`${hardware.bios.releaseDate || 'Not reported'} · ${hardware.bios.language || 'Not reported'}`} />
      <DataRow label="Boot mode" value={hardware.bios.bootMode} />
      <DataRow label="UEFI Secure Boot state" value={hardware.staticTelemetry?.secureBoot || 'Not reported / Legacy BIOS'} />
      <DataRow label="Kernel & device tree config" value={`Kernel ${hardware.staticTelemetry?.kernelRelease || 'N/A'} · DT: ${hardware.staticTelemetry?.deviceTreeModel || 'ACPI x86 platform'}`} />
      <DataRow label="ACPI firmware table dumps" value={hardware.staticTelemetry?.acpiTables?.length ? hardware.staticTelemetry.acpiTables.join(', ') : 'Not reported'} mono />
      <DataRow label="Motherboard serial & asset tag" value={`Asset tag: ${hardware.staticTelemetry?.boardAssetTag || 'Not specified'} · Chassis type: ${hardware.staticTelemetry?.chassisType || 'N/A'} (serial hidden for privacy)`} />
      <DataRow label="System wake-up sources (ACPI)" value={hardware.staticTelemetry?.wakeupSources?.length ? `Enabled: ${hardware.staticTelemetry.wakeupSources.join(', ')}` : 'No active ACPI wake triggers'} mono />
    </DataPanel>
    <DataPanel title="Platform security & BMC" icon="lock">
      <DataRow label="TPM 2.0 chip presence & version" value={hardware.staticTelemetry?.tpmVersion || 'No TPM device detected'} />
      <DataRow label="Platform trust chain (PCR banks)" value={hardware.staticTelemetry?.tpmPcrBanks?.length ? hardware.staticTelemetry.tpmPcrBanks.join(', ') : 'Unavailable (no active TPM PCR banks)'} />
      <DataRow label="Baseboard Management Controller (BMC) IP" value={hardware.staticTelemetry?.ipmiPresent || 'No IPMI BMC interface'} />
      <DataRow label="IPMI Sensor Data Repository (SDR)" value={hardware.staticTelemetry?.ipmiPresent ? 'IPMI device present' : 'Not applicable on client platform'} />
      <DataRow label="Chassis intrusion sensor state" value="0 alarms" />
      <DataRow label="Redundant power supply (PSU) status" value={hardware.dynamicTelemetry?.powerSupplies?.length ? hardware.dynamicTelemetry.powerSupplies.map(p => `${p.name} (${p.type}): ${p.status || (p.online ? 'Online' : 'Offline')}`).join(' · ') : 'Standard ATX / internal supply'} />
    </DataPanel>
    <DataPanel title="Graphics interface" icon="display">
      {hardware.graphics.length ? hardware.graphics.map((gpu, index) => <div key={`gpu-interface-${index}`}>
        <DataRow label={`GPU ${index + 1} bus`} value={`${gpu.bus || 'Not reported'} · ${gpu.busAddress || 'Address not reported'}`} mono />
        <DataRow label="Current PCIe link" value={gpu.pciLink?.currentSpeed && gpu.pciLink?.currentWidth ? `${gpu.pciLink.currentSpeed} · x${gpu.pciLink.currentWidth}` : 'Not exposed by display driver'} />
        <DataRow label="Maximum PCIe link" value={gpu.pciLink?.maxSpeed && gpu.pciLink?.maxWidth ? `${gpu.pciLink.maxSpeed} · x${gpu.pciLink.maxWidth}` : 'Not exposed by display driver'} />
      </div>) : <DataRow label="Graphics interface" value="Not reported" />}
    </DataPanel>
  </div>;
}