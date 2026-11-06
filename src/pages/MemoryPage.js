import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatBytes, formatVoltage } from '../lib/formatters';

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
      <DataRow label="Module timings (CL/RCD/RP/RAS/CR)" value="Not exposed by standard Linux hardware APIs" />
      <DataRow label="Channel mode / NB frequency / FSB:DRAM" value="Not exposed by standard Linux hardware APIs" />
    </DataPanel>
    <DataPanel title="SPD modules" icon="chip">
      {modules.length ? modules.map((module, index) => <div key={`${module.bank || module.partNum}-${index}`}>
        <DataRow label={`Module ${index + 1}`} value={`${formatBytes(module.size)} ${module.type || 'memory'}`} />
        <DataRow label="Configured speed / form factor" value={`${module.clockSpeed ? `${module.clockSpeed} MHz` : 'Not reported'} · ${module.formFactor || 'Not reported'}`} />
        <DataRow label="Slot / bank / ECC" value={`${index + 1} · ${module.bank || 'Not reported'} · ${module.ecc == null ? 'Not reported' : String(module.ecc)}`} />
        <DataRow label="Voltage configured / min / max" value={`${formatVoltage(module.voltageConfigured)} · ${formatVoltage(module.voltageMin)} · ${formatVoltage(module.voltageMax)}`} />
        <DataRow label="Manufacturer / part number" value={`${module.manufacturer || 'Not reported'} · ${module.partNum || 'Not reported'}`} mono />
        <DataRow label="Module serial number" value={module.serialNum} mono />
        <DataRow label="Max bandwidth / ranks / week-year" value="Not exposed by standard Linux hardware APIs" />
      </div>) : <DataRow label="SPD module data" value="Not exposed by this OS or permission level" />}
    </DataPanel>
  </div>;
}