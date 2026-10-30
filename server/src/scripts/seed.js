// One-time setup: creates the owner account and the office from .env values.
// Usage: npm run seed
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { Office } from '../models/Office.js';
import { User } from '../models/User.js';

await connectDatabase(env.mongodbUri);

const latitude = Number(process.env.OFFICE_LAT);
const longitude = Number(process.env.OFFICE_LNG);
if (!process.env.OFFICE_LAT || !process.env.OFFICE_LNG || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
  console.error('Set OFFICE_LAT and OFFICE_LNG in .env to the office coordinates.');
  process.exit(1);
}

let office = await Office.findOne();
if (!office) {
  office = await Office.create({ name: process.env.OFFICE_NAME || 'Main office', latitude, longitude });
  console.log(`Created office "${office.name}" (radius ${office.radiusMeters} m, ${office.monitoringStartLocal} to ${office.monitoringEndLocal} ${office.timezone}).`);
} else {
  console.log(`Office "${office.name}" already exists, leaving it unchanged.`);
}

const email = (process.env.OWNER_EMAIL || '').toLowerCase();
const password = process.env.OWNER_PASSWORD || '';
if (!email || password.length < 8) {
  console.error('Set OWNER_EMAIL and an OWNER_PASSWORD of at least 8 characters in .env.');
  process.exit(1);
}
if (await User.findOne({ email })) {
  console.log(`Owner ${email} already exists.`);
} else {
  await User.create({
    name: process.env.OWNER_NAME || 'Owner',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'owner',
    assignedOfficeId: office._id,
  });
  console.log(`Created owner account ${email}.`);
}

await mongoose.disconnect();
