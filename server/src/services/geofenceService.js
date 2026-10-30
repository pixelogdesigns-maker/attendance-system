import { distanceMeters } from '../utils/distance.js';

// Classify one location reading against the office geofence.
// Returns "uncertain" for stale or inaccurate readings, "buffer" when inside the
// hysteresis band around the boundary, otherwise "inside" or "outside".
export function classifyReading(office, reading, now = new Date()) {
  const distance = distanceMeters(
    office.latitude,
    office.longitude,
    reading.latitude,
    reading.longitude,
  );

  const ageSeconds = (now.getTime() - reading.timestamp.getTime()) / 1000;
  const isStale = ageSeconds > office.staleReadingSeconds || ageSeconds < -60;
  const isInaccurate =
    !Number.isFinite(reading.accuracyMeters) ||
    reading.accuracyMeters > office.maxAcceptedAccuracyMeters;

  if (isStale || isInaccurate) {
    return { distance, classification: 'uncertain', reason: isStale ? 'stale' : 'inaccurate' };
  }
  if (distance > office.radiusMeters + office.outsideBufferMeters) {
    return { distance, classification: 'outside' };
  }
  if (distance < office.radiusMeters - office.insideBufferMeters) {
    return { distance, classification: 'inside' };
  }
  return { distance, classification: 'buffer' };
}

// Check-in uses the plain radius: the reading must be accurate and within it.
export function checkInAllowed(office, reading, now = new Date()) {
  const { distance, classification, reason } = classifyReading(office, reading, now);
  if (classification === 'uncertain') {
    return {
      allowed: false,
      distance,
      message:
        reason === 'stale'
          ? 'Location reading is too old. Please try again.'
          : `GPS accuracy is too low (needs ${office.maxAcceptedAccuracyMeters} m or better). Move near a window and try again.`,
    };
  }
  if (distance > office.radiusMeters) {
    return {
      allowed: false,
      distance,
      message: `You are about ${Math.round(distance)} m from the office. Check-in is only allowed within ${office.radiusMeters} m.`,
    };
  }
  return { allowed: true, distance };
}
