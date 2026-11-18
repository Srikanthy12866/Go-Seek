import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes, formatOptional, formatVoltage } from '../lib/formatters';

export default function MemoryPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;
  if (hardware.runtime !== 'desktop') return <DataPanel title="Memory" icon="chip"><DataRow label="Installed memory" value={hardware.memory} /><DataRow label="Module details" value="Not exposed by browser APIs." /></DataPanel>;

  const modules = hardware.memory.modules || [];
  const memoryTypes = [...new Set(modules.map(module => module.type).filter(Boolean))].join(' / ');
  return <div className="panel-grid">
    <DataPanel title="Memory controller" icon="chip">
      <DataRow label="Installed / available" value={`${formatBytes(hardware.memory.totalBytes)} / ${formatBytes(hardware.memory.availableBytes)}`} />
      <DataRow label="Memory type" value={memoryTypes || 'Not reported'} />
      <DataRow label="Channel mode" value={formatOptional(hardware.memory.channelMode)} />
      <DataRow label="DRAM frequency" value={formatOptional(Number.isFinite(hardware.memory.dramFrequencyMhz) ? `${hardware.memory.dramFrequencyMhz} MHz` : hardware.memory.dramFrequencyMhz)} />
      <DataRow label="Uncore frequency" value={formatOptional(Number.isFinite(hardware.memory.uncoreFrequencyMhz) ? `${hardware.memory.uncoreFrequencyMhz} MHz` : hardware.memory.uncoreFrequencyMhz)} />
      <DataRow label="NB frequency" value={formatOptional(Number.isFinite(hardware.memory.nbFrequencyMhz) ? `${hardware.memory.nbFrequencyMhz} MHz` : hardware.memory.nbFrequencyMhz)} />
      <DataRow label="FSB:DRAM" value={formatOptional(hardware.memory.fsbDram)} />
      <DataRow label="CAS latency (CL)" value={formatOptional(hardware.memory.timings?.cl)} />
      <DataRow label="RAS to CAS delay (tRCD)" value={formatOptional(hardware.memory.timings?.trcd)} />
      <DataRow label="RAS precharge (tRP)" value={formatOptional(hardware.memory.timings?.trp)} />
      <DataRow label="Cycle time (tRAS)" value={formatOptional(hardware.memory.timings?.tras)} />
      <DataRow label="Bank cycle time (tRC)" value={formatOptional(hardware.memory.timings?.trc)} />
      <DataRow label="Command rate (CR)" value={formatOptional(hardware.memory.timings?.commandRate)} />
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
      <DataRow label="NUMA node topography" value={hardware.dynamicTelemetry?.numaNodes?.length ? hardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: CPUs ${n.cpulist || 'N/A'}`).join(' · ') : 'Single-node / not reported'} />
      <DataRow label="NUMA distance / latency matrix" value={hardware.dynamicTelemetry?.numaNodes?.length ? hardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: [${n.distance || '10'}]`).join(' · ') : 'Not reported'} />
      <DataRow label="NUMA memory hit / miss ratio" value={hardware.dynamicTelemetry?.numaNodes?.length ? hardware.dynamicTelemetry.numaNodes.map(n => `${n.node}: ${n.hit ?? 0} hits / ${n.miss ?? 0} misses / ${n.foreign ?? 0} foreign`).join(' · ') : 'Not reported'} />
      <DataRow label="Transparent HugePages (THP) state" value={hardware.dynamicTelemetry?.thpState || 'Not reported'} />
      <DataRow label="Page table footprint" value={hardware.dynamicTelemetry?.pageTablesBytes != null ? `${formatBytes(hardware.dynamicTelemetry.pageTablesBytes)} · AnonHugePages ${formatBytes(hardware.dynamicTelemetry.anonHugePagesBytes || 0)}` : 'Not reported'} />
      <DataRow label="HugePages pool & size" value={hardware.dynamicTelemetry?.hugePageSizeBytes != null ? `${hardware.dynamicTelemetry.hugePagesTotal ?? 0} pages × ${formatBytes(hardware.dynamicTelemetry.hugePageSizeBytes)}` : 'Not reported'} />
      <DataRow label="TLB flush rates & remote IPIs" value={hardware.dynamicTelemetry?.tlbShootdownsTotal != null ? `${hardware.dynamicTelemetry.tlbShootdownsTotal.toLocaleString()} total shootdowns (${hardware.dynamicTelemetry.tlbShootdownsPerCpu.map((c, i) => `C${i}: ${c}`).join(' · ')})` : 'Not reported'} />
      <DataRow label="Hardware memory scrubbing rate" value={hardware.dynamicTelemetry?.edacControllers?.length ? hardware.dynamicTelemetry.edacControllers.map(m => `${m.mc}: ${m.scrubRate || 'N/A'}`).join(' · ') : 'No EDAC memory controller active'} />
      <DataRow label="Uncorrected / corrected ECC error count" value={hardware.dynamicTelemetry?.edacControllers?.length ? hardware.dynamicTelemetry.edacControllers.map(m => `${m.mc}: UE ${m.ueCount ?? 0} · CE ${m.ceCount ?? 0}`).join(' · ') : '0 errors (EDAC inactive or non-ECC RAM)'} />
    </DataPanel>
  </div>;
}