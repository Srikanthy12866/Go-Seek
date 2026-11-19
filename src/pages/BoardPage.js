import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatCapacity, formatOptional } from '../lib/formatters';
import { fetchBoardData } from '../services/boardService';

export default function BoardPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchBoardData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;
  if (activeHardware.runtime !== 'desktop') return <DataPanel title="Board & BIOS" icon="display"><DataRow label="Access" value="Board and firmware details require the desktop app." /></DataPanel>;

  return <div className="panel-grid">
    <DataPanel title="System & mainboard" icon="display">
      <DataRow label="System manufacturer / model" value={`${activeHardware.system?.manufacturer || 'Not reported'} · ${activeHardware.system?.model || 'Not reported'}`} />
      <DataRow label="Mainboard manufacturer / model" value={`${activeHardware.mainboard?.manufacturer || 'Not reported'} · ${activeHardware.mainboard?.model || 'Not reported'}`} />
      <DataRow label="Board version" value={activeHardware.mainboard?.version} />
      <DataRow label="Maximum memory / slots" value={`${formatCapacity(activeHardware.mainboard?.memMax)} · ${activeHardware.mainboard?.memSlots ?? 'Not reported'}`} />
      <DataRow label="PCI host bridge IDs" value={activeHardware.mainboard?.hostBridges?.length ? activeHardware.mainboard.hostBridges.map(device => `${device.vendorId || 'N/A'}:${device.deviceId || 'N/A'}`).join(' · ') : 'Not reported by OS hardware APIs'} mono />
      <DataRow label="Chipset" value={formatOptional(activeHardware.mainboard?.chipset)} />
      <DataRow label="Southbridge" value={formatOptional(activeHardware.mainboard?.southbridge)} />
      <DataRow label="LPCIO controller" value={formatOptional(activeHardware.mainboard?.lpcio)} />
      <DataRow label="Virtual machine" value={activeHardware.system?.virtual ? `Yes · ${activeHardware.system?.virtualHost || 'host unknown'}` : 'No / unknown'} />
    </DataPanel>
    <DataPanel title="BIOS / firmware" icon="chip">
      <DataRow label="Vendor" value={activeHardware.bios?.vendor} />
      <DataRow label="Version / revision" value={`${activeHardware.bios?.version || 'Not reported'} · ${activeHardware.bios?.revision || 'Not reported'}`} />
      <DataRow label="Release date / language" value={`${activeHardware.bios?.releaseDate || 'Not reported'} · ${activeHardware.bios?.language || 'Not reported'}`} />
      <DataRow label="Boot mode" value={activeHardware.bios?.bootMode} />
      <DataRow label="UEFI Secure Boot state" value={activeHardware.staticTelemetry?.secureBoot || 'Not reported / Legacy BIOS'} />
      <DataRow label="Kernel & device tree config" value={`Kernel ${activeHardware.staticTelemetry?.kernelRelease || 'N/A'} · DT: ${activeHardware.staticTelemetry?.deviceTreeModel || 'ACPI x86 platform'}`} />
      <DataRow label="ACPI firmware table dumps" value={activeHardware.staticTelemetry?.acpiTables?.length ? activeHardware.staticTelemetry.acpiTables.join(', ') : 'Not reported'} mono />
      <DataRow label="Motherboard serial & asset tag" value={`Asset tag: ${activeHardware.staticTelemetry?.boardAssetTag || 'Not specified'} · Chassis type: ${activeHardware.staticTelemetry?.chassisType || 'N/A'} (serial hidden for privacy)`} />
      <DataRow label="System wake-up sources (ACPI)" value={activeHardware.staticTelemetry?.wakeupSources?.length ? `Enabled: ${activeHardware.staticTelemetry.wakeupSources.join(', ')}` : 'No active ACPI wake triggers'} mono />
    </DataPanel>
    <DataPanel title="Platform security & BMC" icon="lock">
      <DataRow label="TPM 2.0 chip presence & version" value={activeHardware.staticTelemetry?.tpmVersion || 'No TPM device detected'} />
      <DataRow label="Platform trust chain (PCR banks)" value={activeHardware.staticTelemetry?.tpmPcrBanks?.length ? activeHardware.staticTelemetry.tpmPcrBanks.join(', ') : 'Unavailable (no active TPM PCR banks)'} />
      <DataRow label="Baseboard Management Controller (BMC) IP" value={activeHardware.staticTelemetry?.ipmiPresent || 'No IPMI BMC interface'} />
      <DataRow label="IPMI Sensor Data Repository (SDR)" value={activeHardware.staticTelemetry?.ipmiPresent ? 'IPMI device present' : 'Not applicable on client platform'} />
      <DataRow label="Chassis intrusion sensor state" value="0 alarms" />
      <DataRow label="Redundant power supply (PSU) status" value={activeHardware.dynamicTelemetry?.powerSupplies?.length ? activeHardware.dynamicTelemetry.powerSupplies.map(p => `${p.name} (${p.type}): ${p.status || (p.online ? 'Online' : 'Offline')}`).join(' · ') : 'Standard ATX / internal supply'} />
    </DataPanel>
    <DataPanel title="Graphics interface" icon="display">
      {(activeHardware.graphics || []).length ? activeHardware.graphics.map((gpu, index) => <div key={`gpu-interface-${index}`}>
        <DataRow label={`GPU ${index + 1} bus`} value={`${gpu.bus || 'Not reported'} · ${gpu.busAddress || 'Address not reported'}`} mono />
        <DataRow label="Current PCIe link" value={gpu.pciLink?.currentSpeed && gpu.pciLink?.currentWidth ? `${gpu.pciLink.currentSpeed} · x${gpu.pciLink.currentWidth}` : 'Not exposed by display driver'} />
        <DataRow label="Maximum PCIe link" value={gpu.pciLink?.maxSpeed && gpu.pciLink?.maxWidth ? `${gpu.pciLink.maxSpeed} · x${gpu.pciLink.maxWidth}` : 'Not exposed by display driver'} />
      </div>) : <DataRow label="Graphics interface" value="Not reported" />}
    </DataPanel>
  </div>;
}
