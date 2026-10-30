import { HttpError } from './errorHandler.js';
import { isValidCoordinate } from '../utils/distance.js';

// Parses a location reading from a request body. Client values are untrusted input.
export function parseReading(body = {}) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracyMeters = Number(body.accuracy);
  const timestamp = new Date(Number(body.timestamp));

  if (!isValidCoordinate(latitude, longitude)) {
    throw new HttpError(400, 'Invalid latitude or longitude.');
  }
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
    throw new HttpError(400, 'Invalid accuracy value.');
  }
  if (Number.isNaN(timestamp.getTime())) {
    throw new HttpError(400, 'Invalid reading timestamp.');
  }
  const source = body.source === 'android_app' ? 'android_app' : 'web';
  return { latitude, longitude, accuracyMeters, timestamp, source };
}

export function requireString(value, name, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new HttpError(400, `${name} must be between ${min} and ${max} characters.`);
  }
  return value.trim();
}

export function pick(source, keys) {
  return Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]]));
}
