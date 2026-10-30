import mongoose from 'mongoose';

export const RETENTION_SECONDS = 30 * 24 * 60 * 60; // 1 month, as agreed with the owner

const locationEventSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
    receivedAt: { type: Date, required: true }, // server timestamp
    deviceTimestamp: { type: Date },
    latitude: Number,
    longitude: Number,
    accuracyMeters: Number,
    distanceFromOfficeMeters: Number,
    classification: { type: String, enum: ['inside', 'outside', 'buffer', 'uncertain'] },
    eventType: { type: String, enum: ['check_in', 'sample', 'departure', 'return'], default: 'sample' },
    source: { type: String, enum: ['android_app', 'web'], default: 'web' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

locationEventSchema.index({ employeeId: 1, receivedAt: -1 });
locationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const LocationEvent = mongoose.model('LocationEvent', locationEventSchema);
