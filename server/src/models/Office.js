import mongoose from 'mongoose';
import { parseNetworkEntry } from '../utils/network.js';

const clock = { type: String, match: /^\d{2}:\d{2}$/ };

function requiredForGps() {
  return this.checkMethod === 'gps';
}

const officeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    latitude: { type: Number, required: requiredForGps, min: -90, max: 90 },
    longitude: { type: Number, required: requiredForGps, min: -180, max: 180 },
    // "wifi": presence = connected to the office internet connection. "gps": presence = inside the geofence.
    checkMethod: { type: String, enum: ['wifi', 'gps'], default: 'wifi' },
    // Public IP addresses or ranges of the office internet connection, e.g. "203.0.113.5" or "2001:db8:1:2::/64".
    officeNetworks: {
      type: [String],
      default: [],
      validate: {
        validator: (entries) => entries.every((e) => parseNetworkEntry(e)),
        message: 'Each office network must be an IP address or range like 203.0.113.0/24.',
      },
    },
    radiusMeters: { type: Number, default: 150, min: 30, max: 2000 },
    // Hysteresis band around the boundary so standing at the door does not flip state.
    outsideBufferMeters: { type: Number, default: 20, min: 0 },
    insideBufferMeters: { type: Number, default: 20, min: 0 },
    maxAcceptedAccuracyMeters: { type: Number, default: 50, min: 5 },
    staleReadingSeconds: { type: Number, default: 120, min: 10 },
    outsideReadingsRequired: { type: Number, default: 3, min: 1 },
    insideReadingsRequired: { type: Number, default: 2, min: 1 },
    sampleIntervalSeconds: { type: Number, default: 180, min: 30 },
    noUpdateMinutes: { type: Number, default: 10, min: 1 },
    lateAfterMinutes: { type: Number, default: 15, min: 0 },
    timezone: { type: String, default: 'Asia/Kolkata' },
    monitoringStartLocal: { ...clock, default: '10:00' },
    monitoringEndLocal: { ...clock, default: '18:00' },
    sendReturnAlerts: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Office = mongoose.model('Office', officeSchema);
