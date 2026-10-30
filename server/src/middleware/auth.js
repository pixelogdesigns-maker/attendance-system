import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError } from './errorHandler.js';

export const TOKEN_TTL = '12h';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.authSecret, {
    expiresIn: TOKEN_TTL,
  });
}

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Please sign in.'));
  try {
    const payload = jwt.verify(token, env.authSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return next(new HttpError(401, 'Account is not active.'));
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, 'Session expired. Please sign in again.'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have access to this.'));
    }
    next();
  };
}
