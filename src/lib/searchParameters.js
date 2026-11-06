const routeByRoot = {
  applications: '/applications',
  baseboard: '/board',
  bench: '/compute',
  bios: '/board',
  cpu: '/compute',
  cpuInventory: '/compute',
  display: '/display',
  graphics: '/compute',
  mainboard: '/board',
  memory: '/memory',
  network: '/connectivity',
  networkTraffic: '/connectivity',
  pci: '/devices',
  sensors: '/compute',
  soc: '/compute',
  storage: '/storage',
  storageIO: '/storage',
  system: '/board',
  usb: '/devices',
};

const hiddenKeys = new Set(['capturedAt', 'updatedAt', 'userAgent']);

const normalize = (value) => String(value).toLocaleLowerCase().replace(/[^a-z0-9]/g, '');

const formatLabel = (parts) => parts.map((part) => {
  if (/^\d+$/.test(part)) return `#${Number(part) + 1}`;
  return part
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, character => character.toUpperCase());
}).join(' / ');

const formatValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

export function searchParameters(snapshot, query, limit = 10) {
  const search = normalize(query.trim());
  if (!snapshot || !search) return [];

  const matches = [];
  const visit = (value, parts) => {
    if (value == null || value instanceof Date) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...parts, String(index)]));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        if (!hiddenKeys.has(key)) visit(item, [...parts, key]);
      });
      return;
    }

    const label = formatLabel(parts);
    const formattedValue = formatValue(value);
    if (!normalize(label).includes(search) && !normalize(formattedValue).includes(search)) return;

    matches.push({
      key: parts.join('.'),
      label,
      value: formattedValue.length > 120 ? `${formattedValue.slice(0, 117)}...` : formattedValue,
      route: routeByRoot[parts[0]] || '/environment',
    });
  };

  visit(snapshot, []);
  return matches.slice(0, limit);
}