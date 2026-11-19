import { useEffect, useState } from 'react';
import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes, formatOptional, formatVoltage } from '../lib/formatters';
import { fetchMemoryData } from '../services/memoryService';

export default function MemoryPage() {
  const { hardware } = useHardware();
  const [menuData, setMenuData] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchMemoryData().then((data) => {
      if (mounted && data) setMenuData(data);
    });
    return () => { mounted = false; };
  }, []);

  const activeHardware = menuData ? { ...hardware, ...menuData } : hardware;
  if (!activeHardware) return null;
  if (activeHardware.runtime !== 'desktop') return <DataPanel title="Memory" icon="chip"><DataRow label="Installed memory" value={activeHardware.memory} /><DataRow label="Module details" value="Not exposed by browser APIs." /></DataPanel>;

  const modules = activeHardware.memory?.modules || [];
  const memoryTypes = [...new Set(modules.map(module => module.type).filter(Boolean))].join(' / ');
  return <div className="panel-grid">
    <DataPanel title="Memory controller" icon="chip">
      <DataRow label="Installed / available" value={`${formatBytes(activeHardware.memory?.totalBytes)} / ${formatBytes(activeHardware.memory?.availableBytes)}`} />
      <DataRow label="Memory type" value={memoryTypes || 'Not reported'} />
      <DataRow label="Channel mode" value={formatOptional(activeHardware.memory?.channelMode)} />
      <DataRow label="DRAM frequency" value={formatOptional(Number.isFinite(activeHardware.memory?.dramFrequencyMhz) ? `${activeHardware.memory.dramFrequencyMhz} MHz` : activeHardware.memory?.dramFrequencyMhz)} />
      <DataRow label="Uncore frequency" value={formatOptional(Number.isFinite(activeHardware.memory?.uncoreFrequencyMhz) ? `${activeHardware.memory.uncoreFrequencyMhz} MHz` : activeHardware.memory?.uncoreFrequencyMhz)} />
      <DataRow label="NB frequency" value={formatOptional(Number.isFinite(activeHardware.memory?.nbFrequencyMhz) ? `${activeHardware.memory.nbFrequencyMhz} MHz` : activeHardware.memory?.nbFrequencyMhz)} />
      <DataRow label="FSB:DRAM" value={formatOptional(activeHardware.memory?.fsbDram)} />
      <DataRow label="CAS latency (CL)" value={formatOptional(activeHardware.memory?.timings?.cl)} />
      <DataRow label="RAS to CAS delay (tRCD)" value={formatOptional(activeHardware.memory?.timings?.trcd)} />
      <DataRow label="RAS precharge (tRP)" value={formatOptional(activeHardware.memory?.timings?.trp)} />
      <DataRow label="Cycle time (tRAS)" value={formatOptional(activeHardware.memory?.timings?.tras)} />
      <DataRow label="Bank cycle time (tRC)" value={formatOptional(activeHardware.memory?.timings?.trc)} />
      <DataRow label="Command rate (CR)" value={formatOptional(activeHardware.memory?.timings?.commandRate)} />
    </DataPanel>
    <DataPanel title="SPD modules" icon="chip">
      {modules.length ? modules.map((module, index) => <div key={`${module.bank || module.partNum}-${index}`}>
        <DataRow label={`Module ${index + 1}`} value={`${formatBytes(module.size)} ${module.type || 'memory'}`} />
        <DataRow label="Configured speed / form factor" value={`${module.clockSpeed ? `${module.clockSpeed} MHz` : 'Not reported'} · ${module.formFactor || 'Not reported'}`} />
        <DataRow label="Slot / bank / ECC" value={`${index + 1} · ${module.bank || 'Not reported'} · ${module.ecc == null ? 'Not reported' : String(module.ecc)}`} />
        <DataRow label="Voltage configured / min / max" value={`${formatVoltage(module.voltageConfigured)} · ${formatVoltage(module.voltageMin)} · ${formatVoltage(module.voltageMax)}`} />
        <DataRow label="Manufacturer / part number" value={`${module.manufacturer || 'Not reported'} · ${module.partNum || 'Not reported'}`} mono />
        <DataRow label="DRAM manufacturer" value={formatOptional(module.dramManufacturer)} />
        <DataRow label="Module serial number" value={module.serialNum} mono />
        <DataRow label="Max bandwidth" value={formatOptional(module.maxBandwidth)} />
        <DataRow label="Ranks" value={formatOptional(module.ranks)} />
        <DataRow label="Manufacture week / year" value={module.manufactureWeek || module.manufactureYear ? `${formatOptional(module.manufactureWeek)} / ${formatOptional(module.manufactureYear)}` : formatOptional(null)} />
        <DataRow label="JEDEC timings" value={formatOptional(module.jedecTimings)} />
        <DataRow label="XMP / EXPO profiles" value={formatOptional(module.xmpProfiles)} />
      </div>) : <DataRow label="SPD module data" value="Not exposed by this OS or permission level" />}
    </DataPanel>
    <DataPanel title="NUMA, paging & ECC telemetry" icon="chip">
      <DataRow label="NUMA node topography" value={activeHardware.dynamicTelemetry?.numaNodes?.length ? activeHardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: CPUs ${n.cpulist || 'N/A'}`).join(' · ') : 'Single-node / not reported'} />
      <DataRow label="NUMA distance / latency matrix" value={activeHardware.dynamicTelemetry?.numaNodes?.length ? activeHardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: [${n.distance || '10'}]`).join(' · ') : 'Not reported'} />
      <DataRow label="NUMA memory hit / miss ratio" value={activeHardware.dynamicTelemetry?.numaNodes?.length ? activeHardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: ${n.hit ?? 0} hits / ${n.miss ?? 0} misses / ${n.foreign ?? 0} foreign`).join(' · ') : 'Not reported'} />
      <DataRow label="Transparent HugePages (THP) state" value={activeHardware.dynamicTelemetry?.thpState || 'Not reported'} />
      <DataRow label="Page table footprint" value={activeHardware.dynamicTelemetry?.pageTablesBytes != null ? `${formatBytes(activeHardware.dynamicTelemetry.pageTablesBytes)} · AnonHugePages ${formatBytes(activeHardware.dynamicTelemetry.anonHugePagesBytes || 0)}` : 'Not reported'} />
      <DataRow label="HugePages pool & size" value={activeHardware.dynamicTelemetry?.hugePageSizeBytes != null ? `${activeHardware.dynamicTelemetry.hugePagesTotal ?? 0} pages × ${formatBytes(activeHardware.dynamicTelemetry.hugePageSizeBytes)}` : 'Not reported'} />
      <DataRow label="TLB flush rates & remote IPIs" value={activeHardware.dynamicTelemetry?.tlbShootdownsTotal != null ? `${activeHardware.dynamicTelemetry.tlbShootdownsTotal.toLocaleString()} total shootdowns (${(activeHardware.dynamicTelemetry.tlbShootdownsPerCpu || []).map((c, i) => `C${i}: ${c}`).join(' · ')})` : 'Not reported'} />
      <DataRow label="Hardware memory scrubbing rate" value={activeHardware.dynamicTelemetry?.edacControllers?.length ? activeHardware.dynamicTelemetry.edacControllers.map(m => `${m.mc}: ${m.scrubRate || 'N/A'}`).join(' · ') : 'No EDAC memory controller active'} />
      <DataRow label="Uncorrected / corrected ECC error count" value={activeHardware.dynamicTelemetry?.edacControllers?.length ? activeHardware.dynamicTelemetry.edacControllers.map(m => `${m.mc}: UE ${m.ueCount ?? 0} · CE ${m.ceCount ?? 0}`).join(' · ') : '0 errors (EDAC inactive or non-ECC RAM)'} />
    </DataPanel>
  </div>;
}
