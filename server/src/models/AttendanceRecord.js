import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
    workDate: { type: String, required: true }, // office-local YYYY-MM-DD
    checkInAt: { type: Date, required: true }, // server time
    checkOutAt: { type: Date, default: null },
    late: { type: Boolean, default: false },
    status: { type: String, enum: ['present', 'late', 'completed', 'exception'], default: 'present' },
    monitoringStatus: { type: String, enum: ['active', 'stopped'], default: 'active' },

    // Departure detection state
    locationState: { type: String, enum: ['inside', 'outside'], default: 'inside' },
    consecutiveOutside: { type: Number, default: 0 },
    consecutiveInside: { type: Number, default: 0 },
    departureCount: { type: Number, default: 0 },
    lastReadingAt: { type: Date }, // server receipt time of the last reading
    lastDeviceTimestamp: { type: Date }, // used to drop out-of-order readings
    lastClassification: { type: String, enum: ['inside', 'outside', 'buffer', 'uncertain'] },
    lastDistanceMeters: { type: Number },
  },
  { timestamps: true, optimisticConcurrency: true },
);

attendanceRecordSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });
attendanceRecordSchema.index({ workDate: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
