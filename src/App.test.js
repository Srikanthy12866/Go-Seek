import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => {
  delete window.deviceHardware;
  window.location.hash = '';
});

test('renders the device report and browser access note', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /your device, in detail/i })).toBeInTheDocument();
  expect(screen.getByText('Powered by Srikanth Yepalagunta')).toHaveClass('print-attribution');
  expect(screen.getByText(/browser-limited report/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /refresh/i })).toBeInTheDocument();
});

test('renders desktop Linux inventory without host identifiers', async () => {
  window.deviceHardware = {
    getSnapshot: jest.fn().mockResolvedValue({
      runtime: 'desktop',
      capturedAt: Date.now(),
      operatingSystem: 'Ubuntu Linux',
      soc: {
        name: 'Test CPU', manufacturer: 'Test Vendor', family: '6', model: '1', stepping: '3',
        revision: 'A1', socket: 'AM4', voltage: '1.20', instructions: ['sse', 'sse2', 'avx2'],
        processNode: 'Not reported', codeName: null, maxTdpWatts: null, extendedFamily: 0, extendedModel: 0, baseModel: 1,
        multiplier: null, busSpeedMhz: null, platformLink: null,
      },
      cpu: {
        logicalCores: 8,
        physicalCores: 4,
        performanceCores: null,
        efficiencyCores: null,
        architecture: 'Family 6 / Model 1',
        minSpeedGhz: 0.8,
        maxSpeedGhz: 4,
        governor: 'schedutil',
        current: [1.5, 3.25],
        averageSpeedGhz: 2.35,
        utilizationPercent: 61,
        perCoreUtilizationPercent: [28, 87],
        caches: {},
        cacheInstances: [{ level: 1, type: 'Data', sizeBytes: 32768, ways: 8, lineSizeBytes: 64, sharedCpuList: '0,2' }],
        temperatureC: null,
        perCoreTemperatureC: [],
        microcodeRevision: '0x1234',
      },
      cpuInventory: {
        architecture: 'x86_64',
        operationModes: '32-bit, 64-bit',
        byteOrder: 'Little Endian',
        vendorId: 'GenuineIntel',
        bogoMips: 6585.26,
        virtualization: 'VT-x',
        hypervisorVendor: null,
        threadsPerCore: 2,
        coresPerSocket: 2,
        sockets: 1,
        numaNodes: 1,
        caches: { l1d: '64 KiB (2 instances)', l1i: '64 KiB (2 instances)', l2: '512 KiB (2 instances)', l3: '3 MiB (1 instance)' },
        flags: ['sse', 'sse2', 'avx2'],
        numaCpuMap: [{ node: '0', cpus: '0-3' }],
      },
      applicationsSupported: true,
      applications: [{ pid: 4321, name: 'Firefox', cpuPercent: 26.3, memoryPercent: 2.5, residentBytes: 512 * 1024 ** 2, state: 'running', started: '2026-11-06 09:00:00', childProcessCount: 4 }],
      graphics: [{ vendor: 'Test GPU vendor', subVendor: 'Test GPU board', model: 'Test GPU', bus: 'PCIe', busAddress: '0000:01:00.0', pciID: '1234:abcd', pciLink: { currentSpeed: '16.0 GT/s PCIe', currentWidth: '8', maxSpeed: '16.0 GT/s PCIe', maxWidth: '16' }, vram: 8192, vramDynamic: true, clockCore: 1200, clockMemory: 7000, utilizationGpu: 53, temperatureGpu: 61 }],
      bench: { singleThread: null, multiThread: null, referenceComparison: null, stressTest: null },
      memory: {
        totalBytes: 16 * 1024 ** 3,
        availableBytes: 8 * 1024 ** 3,
        channelMode: null,
        dramFrequencyMhz: null,
        timings: { cl: null, trcd: null, trp: null, tras: null, trc: null, commandRate: null },
        modules: [{ size: 8 * 1024 ** 3, type: 'DDR4', clockSpeed: 3200, formFactor: 'DIMM', bank: 'BANK 0', manufacturer: 'Test Vendor', partNum: 'TEST-8G', serialNum: 'SPD-SERIAL-1234', ecc: 'No', voltageConfigured: 1.2, voltageMin: 1.1, voltageMax: 1.35, ranks: null, maxBandwidth: null, manufactureWeek: null, manufactureYear: null, dramManufacturer: null, jedecTimings: null, xmpProfiles: null }],
      },
      system: {},
      mainboard: { manufacturer: 'Test Board vendor', model: 'Test Board', memMax: 32 * 1024 ** 3, memSlots: 2, chipset: null, southbridge: null, lpcio: null, hostBridges: [{ classCode: '0x060000', vendorId: '0x8086', deviceId: '0x1234' }] },
      bios: { bootMode: 'UEFI' },
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

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search parameters' }), { target: { value: 'BogoMIPS' } });
  const searchResult = screen.getByRole('option', { name: /Bogo Mips.*6585\.26/i });
  expect(searchResult).toBeInTheDocument();
  fireEvent.click(searchResult);
  expect(window.location.hash).toBe('#/compute');
  expect(screen.getByRole('heading', { name: 'Processor & live clocks' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Applications' }));
  expect(window.location.hash).toBe('#/applications');
  expect(screen.getByRole('heading', { name: 'Current user applications' })).toBeInTheDocument();
  expect(screen.getByText('Firefox')).toBeInTheDocument();
  expect(screen.getByText(/PID 4321/)).toBeInTheDocument();
  expect(screen.getByText('26.3%')).toBeInTheDocument();
  expect(screen.getByText(/2\.5% · 512\.00 MB/)).toBeInTheDocument();
  expect(screen.queryByText('systemd')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Memory' }));
  expect(screen.getByRole('heading', { name: 'SPD modules' })).toBeInTheDocument();
  expect(screen.getByText(/1 · BANK 0 · No/)).toBeInTheDocument();
  expect(screen.getByText(/1\.20 V · 1\.10 V · 1\.35 V/)).toBeInTheDocument();
  expect(screen.getByText('SPD-SERIAL-1234')).toBeInTheDocument();
  expect(screen.getByText('CAS latency (CL)')).toBeInTheDocument();
  expect(screen.getByText('XMP / EXPO profiles')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Board & BIOS' }));
  expect(screen.getByRole('heading', { name: 'System & mainboard' })).toBeInTheDocument();
  expect(screen.getByText('Chipset')).toBeInTheDocument();
  expect(screen.getByText('Southbridge')).toBeInTheDocument();
  expect(screen.getByText('LPCIO controller')).toBeInTheDocument();
  expect(screen.getByText(/0x8086:0x1234/)).toBeInTheDocument();
  expect(screen.getByText(/Maximum memory/)).toBeInTheDocument();
  expect(screen.getByText('UEFI')).toBeInTheDocument();
  expect(screen.getByText(/16\.0 GT\/s PCIe · x8/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Display' }));
  expect(screen.getByRole('heading', { name: 'Displays' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Connectivity' }));
  expect(screen.getByRole('heading', { name: 'Network links' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Compute & graphics' }));
  expect(screen.getByRole('meter', { name: 'Core 1 frequency' })).toHaveAttribute('aria-valuenow', '3.25');
  expect(screen.getByRole('meter', { name: 'Graphics processor 1 utilization' })).toHaveAttribute('aria-valuenow', '53');
  expect(screen.getByText(/AM4/)).toBeInTheDocument();
  expect(screen.getByText(/x86_64 · 32-bit, 64-bit/)).toBeInTheDocument();
  expect(screen.getByText(/6585\.26/)).toBeInTheDocument();
  expect(screen.getAllByText(/Node 0: 0-3/)).toHaveLength(1);
  expect(screen.getByText('Code name')).toBeInTheDocument();
  expect(screen.getByText(/0 \/ 0 \/ 1/)).toBeInTheDocument();
  expect(screen.getByText(/8-way · 64-byte line/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'CPU benchmark' })).toBeInTheDocument();
  expect(screen.getByText(/sse, sse2, avx2/)).toBeInTheDocument();
  expect(screen.getByText(/Test GPU board/)).toBeInTheDocument();
  expect(screen.getByText(/1234:abcd/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Storage' }));
  expect(await screen.findByText(/Test Vendor Test drive/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Devices & power' }));
  expect(screen.getAllByText(/0x1234/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/192\.0\.2\.10|AA:BB:CC:DD:EE:FF|private-usb-serial/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Storage' }));
  expect(screen.getByRole('heading', { name: 'Filesystem capacity' })).toBeInTheDocument();
  expect(screen.getByText(/25\.0%/)).toBeInTheDocument();

  const initialSnapshot = await window.deviceHardware.getSnapshot.mock.results.at(-1).value;
  window.deviceHardware.getSnapshot = jest.fn().mockResolvedValue({
    ...initialSnapshot,
    capturedAt: initialSnapshot.capturedAt + 1000,
    cpu: { ...initialSnapshot.cpu, averageSpeedGhz: 3.1 },
  });
  fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
  expect(await screen.findAllByText('3.10 GHz')).toHaveLength(1);
  await waitFor(() => expect(container.querySelector('.frequency-trend-line')).toHaveAttribute('points', expect.stringContaining(' ')));
});
