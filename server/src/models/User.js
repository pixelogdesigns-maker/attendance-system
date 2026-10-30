import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['employee', 'owner'], default: 'employee' },
    active: { type: Boolean, default: true },
    assignedOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office' },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    active: this.active,
    assignedOfficeId: this.assignedOfficeId,
  };
};

export const User = mongoose.model('User', userSchema);
