import { DataPanel, DataRow } from '../components/HardwareUI';
import { useHardware } from '../context/HardwareContext';
import { formatRate, sumRates } from '../lib/formatters';

export default function ConnectivityPage() {
  const { hardware } = useHardware();
  if (!hardware) return null;

  if (hardware.runtime !== 'desktop') return <div className="panel-grid">
    <DataPanel title="Network connection" icon="wifi">
      <DataRow label="Connection" value={hardware.networkStatus} />
      <DataRow label="Effective type" value={hardware.networkType} />
      <DataRow label="Estimated downlink" value={hardware.downlink} />
      <DataRow label="Round-trip latency" value={hardware.latency} />
      <DataRow label="Data saver" value={hardware.dataSaver} />
    </DataPanel>
    <DataPanel title="Power & storage" icon="chip"><DataRow label="Battery" value={hardware.battery} /><DataRow label="Site storage" value={hardware.storage} /><DataRow label="Storage scope" value="This website only" /></DataPanel>
  </div>;

  const network = (hardware.network || []).filter(item => !item.internal && !item.virtual);
  const traffic = hardware.networkTraffic || [];
  return <div className="panel-grid">
    <DataPanel title="Network links" icon="wifi">
      {network.length ? network.map((item, index) => <div key={`network-${index}`}>
        <DataRow label={`Adapter ${index + 1}`} value={`${item.type || 'Network'}${item.default ? ' · default route' : ''}`} />
        <DataRow label="Link state / speed" value={`${item.operstate || 'Unknown'} · ${item.speed ? `${item.speed} Mbps` : 'Not reported'}`} />
        <DataRow label="Duplex / MTU" value={`${item.duplex || 'N/A'} · ${item.mtu || 'N/A'}`} />
      </div>) : <DataRow label="Network links" value="No physical network links reported" />}
      <DataRow label="Aggregate receive" value={formatRate(sumRates(traffic, 'rx_sec'))} />
      <DataRow label="Aggregate transmit" value={formatRate(sumRates(traffic, 'tx_sec'))} />
    </DataPanel>
    <DataPanel title="Link privacy" icon="lock"><div className="privacy-note"><span>IP and MAC addresses are excluded from this report.</span></div></DataPanel>
  </div>;
}