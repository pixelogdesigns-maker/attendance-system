import { HttpError } from '../middleware/errorHandler.js';
import { parseReading } from '../middleware/validate.js';
import { isIpAllowed } from '../utils/network.js';
import { checkInAllowed, classifyReading } from './geofenceService.js';

// Decides whether a request shows the employee at the office, using the office's check method.
// Wi-Fi: the request must come from the office internet connection. GPS: the reading must be inside the geofence.
export function classifyPresence(office, req, now = new Date()) {
  if (office.checkMethod === 'gps') {
    const reading = parseReading(req.body);
    const { distance, classification } = classifyReading(office, reading, now);
    return { classification, distance, reading };
  }
  const onOfficeNetwork = isIpAllowed(req.ip, office.officeNetworks);
  return { classification: onOfficeNetwork ? 'inside' : 'outside', distance: null, reading: null };
}

// Throws a clear error when check-in is not allowed from this request.
export function assertCanCheckIn(office, req, now = new Date()) {
  if (office.checkMethod === 'gps') {
    const reading = parseReading(req.body);
    const check = checkInAllowed(office, reading, now);
    if (!check.allowed) throw new HttpError(400, check.message);
    return { distance: check.distance, reading };
  }
  if (office.officeNetworks.length === 0) {
    throw new HttpError(409, 'The office Wi-Fi has not been set up yet. Ask the owner to add it in Settings.');
  }
  if (!isIpAllowed(req.ip, office.officeNetworks)) {
    throw new HttpError(400, 'Connect your phone to the office Wi-Fi (turn off mobile data) and try again.');
  }
  return { distance: null, reading: null };
}

// Fields for a LocationEvent row from either method.
export function eventFields(req, presence) {
  const { reading } = presence;
  return {
    receivedAt: new Date(),
    deviceTimestamp: reading?.timestamp,
    latitude: reading?.latitude,
    longitude: reading?.longitude,
    accuracyMeters: reading?.accuracyMeters,
    distanceFromOfficeMeters: presence.distance ?? undefined,
    method: reading ? 'gps' : 'wifi',
    source: reading?.source || 'web',
  };
}
