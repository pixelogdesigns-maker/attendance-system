import net from 'node:net';

// "::ffff:203.0.113.5" -> "203.0.113.5"
export function normalizeIp(ip) {
  if (!ip) return '';
  const value = String(ip).trim();
  return value.startsWith('::ffff:') && net.isIPv4(value.slice(7)) ? value.slice(7) : value;
}

// Parses "203.0.113.5", "203.0.113.0/24" or "2001:db8:1:2::/64". Returns null when invalid.
export function parseNetworkEntry(entry) {
  const [address, prefixText] = String(entry).trim().split('/');
  const family = net.isIPv4(address) ? 'ipv4' : net.isIPv6(address) ? 'ipv6' : null;
  if (!family) return null;
  const maxPrefix = family === 'ipv4' ? 32 : 128;
  const prefix = prefixText === undefined ? maxPrefix : Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) return null;
  return { address, prefix, family };
}

export function isIpAllowed(ip, entries = []) {
  const address = normalizeIp(ip);
  const family = net.isIPv4(address) ? 'ipv4' : net.isIPv6(address) ? 'ipv6' : null;
  if (!family) return false;
  const list = new net.BlockList();
  for (const entry of entries) {
    const parsed = parseNetworkEntry(entry);
    if (parsed) list.addSubnet(parsed.address, parsed.prefix, parsed.family);
  }
  return list.check(address, family);
}

// The entry to save for "the network I'm on now". Phones on IPv6 rotate their
// address inside the network's /64, so the whole /64 is saved.
export function networkEntryFor(ip) {
  const address = normalizeIp(ip);
  if (net.isIPv4(address)) return address;
  if (net.isIPv6(address)) {
    const groups = expandIpv6(address).slice(0, 4).map((g) => g.replace(/^0+(?=.)/, ''));
    return `${groups.join(':')}::/64`;
  }
  return null;
}

function expandIpv6(address) {
  const [head, tail = ''] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const fill = address.includes('::') ? 8 - headGroups.length - tailGroups.length : 0;
  return [...headGroups, ...Array(fill).fill('0'), ...tailGroups];
}
