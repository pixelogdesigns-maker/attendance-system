import mongoose from 'mongoose';
import { RETENTION_SECONDS } from './LocationEvent.js';

const alertSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
    eventType: { type: String, enum: ['departure', 'return', 'no_update'], required: true },
    detectedAt: { type: Date, required: true },
    channel: { type: String, enum: ['whatsapp'], default: 'whatsapp' },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    attempts: { type: Number, default: 0 },
    providerMessageId: String,
    dedupeKey: { type: String, required: true, unique: true },
    failureCode: String,
  },
  { timestamps: true },
);

alertSchema.index({ detectedAt: -1 });
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const Alert = mongoose.model('Alert', alertSchema);
