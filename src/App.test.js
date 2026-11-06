import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => {
  delete window.deviceHardware;
});

test('renders the device report and browser access note', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /your device, in detail/i })).toBeInTheDocument();
  expect(screen.getByText(/browser-limited report/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /refresh/i })).toBeInTheDocument();
});

test('renders desktop Linux inventory without host identifiers', async () => {
  window.deviceHardware = {
    getSnapshot: jest.fn().mockResolvedValue({
      runtime: 'desktop',
      capturedAt: Date.now(),
      operatingSystem: 'Ubuntu Linux',
      soc: { name: 'Test CPU', manufacturer: 'Test Vendor', family: '6', model: '1', processNode: 'Not reported' },
      cpu: {
        logicalCores: 8,
        physicalCores: 4,
        performanceCores: null,
        efficiencyCores: null,
        architecture: 'Family 6 / Model 1',
        maxSpeedGhz: 4,
        current: [1.5, 3.25],
        averageSpeedGhz: 2.35,
        utilizationPercent: 61,
        perCoreUtilizationPercent: [28, 87],
        caches: {},
        temperatureC: null,
        perCoreTemperatureC: [],
        microcodeRevision: '0x1234',
      },
      graphics: [{ vendor: 'Test GPU vendor', model: 'Test GPU', clockCore: 1200, clockMemory: 7000, utilizationGpu: 53, temperatureGpu: 61 }],
      memory: { totalBytes: 16 * 1024 ** 3, availableBytes: 8 * 1024 ** 3, modules: [] },
      system: {},
      mainboard: {},
      bios: {},
      display: [],
      storage: {
        disks: [{ name: 'Test drive', vendor: 'Test Vendor', type: 'NVMe', size: 512 * 1024 ** 3, interfaceType: 'PCIe', firmwareRevision: '1.0', smartStatus: 'Ok' }],
        devices: [],
        filesystems: [{ type: 'ext4', size: 512 * 1024 ** 3, used: 128 * 1024 ** 3, available: 384 * 1024 ** 3, use: 25, rw: true }],
      },
      network: [{ type: 'Ethernet', default: true, operstate: 'up', speed: 1000, duplex: 'full', mtu: 1500, internal: false, virtual: false, ip4: '192.0.2.10', mac: 'AA:BB:CC:DD:EE:FF' }],
      networkTraffic: [{ rx_sec: 1024, tx_sec: 2048 }],
      storageIO: { readBytesPerSecond: 1024, writeBytesPerSecond: 2048 },
      usb: [{ name: 'Test keyboard', manufacturer: 'Test Vendor', bus: 'USB', maxPower: '100mA', removable: true, serialNumber: 'private-usb-serial' }],
      pci: [{ classCode: '0x030000', vendorId: '0x1234', deviceId: '0xabcd' }],
      battery: { hasBattery: false },
      sensors: { fans: [] },
    }),
  };

  const { container } = render(<App />);

  expect(await screen.findByRole('heading', { name: 'CPU frequency & utilization' })).toBeInTheDocument();
  expect(screen.getAllByText('2.35 GHz')).toHaveLength(1);
  expect(screen.getByText('61%')).toBeInTheDocument();
  expect(screen.getAllByText('8.00 GB')).toHaveLength(2);
  expect(screen.getByText(/used of 16\.00 GB/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Memory usage' })).toBeInTheDocument();
  expect(screen.getByRole('meter', { name: 'Memory usage' })).toHaveAttribute('aria-valuetext', '50.00% used');
  expect(screen.getByText(/LIVE · 1 SECOND/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Network activity' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Storage read / write' })).toBeInTheDocument();
  expect(screen.getByRole('meter', { name: 'Storage read speed' })).toHaveAttribute('aria-valuetext', '1 KB/s');
  expect(screen.queryByRole('heading', { name: 'Physical storage' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Firmware & sensors' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Memory modules' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'System & mainboard' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Displays' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Network links' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'USB devices' })).not.toBeInTheDocument();
  expect(await screen.findByRole('img', { name: 'CPU average frequency trend over the last minute' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Memory' }));
  expect(screen.getByRole('heading', { name: 'Memory modules' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Board & BIOS' }));
  expect(screen.getByRole('heading', { name: 'System & mainboard' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Display' }));
  expect(screen.getByRole('heading', { name: 'Displays' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Connectivity' }));
  expect(screen.getByRole('heading', { name: 'Network links' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Compute & graphics' }));
  expect(screen.getByRole('meter', { name: 'Core 1 frequency' })).toHaveAttribute('aria-valuenow', '3.25');
  expect(screen.getByRole('meter', { name: 'Graphics processor 1 utilization' })).toHaveAttribute('aria-valuenow', '53');

  fireEvent.click(screen.getByRole('button', { name: 'Storage' }));
  expect(await screen.findByText(/Test Vendor Test drive/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Devices & power' }));
  expect(screen.getAllByText(/0x1234/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/192\.0\.2\.10|AA:BB:CC:DD:EE:FF|private-usb-serial/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Storage' }));
  expect(screen.getByRole('heading', { name: 'Filesystem capacity' })).toBeInTheDocument();
  expect(screen.getByText(/25\.0%/)).toBeInTheDocument();

  const initialSnapshot = await window.deviceHardware.getSnapshot.mock.results.at(-1).value;
  window.deviceHardware.getSnapshot = jest.fn().mockResolvedValue({
    ...initialSnapshot,
    capturedAt: initialSnapshot.capturedAt + 1000,
    cpu: { ...initialSnapshot.cpu, averageSpeedGhz: 3.1 },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
  expect(await screen.findAllByText('3.10 GHz')).toHaveLength(1);
  await waitFor(() => expect(container.querySelector('.frequency-trend-line')).toHaveAttribute('points', expect.stringContaining(' ')));
});
