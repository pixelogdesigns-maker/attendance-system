import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireString } from '../middleware/validate.js';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

authRouter.post('/login', loginLimiter, async (req, res) => {
  const email = requireString(req.body?.email, 'Email').toLowerCase();
  const password = requireString(req.body?.password, 'Password', { max: 200 });
  const user = await User.findOne({ email });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Wrong email or password.');
  res.json({ token: signToken(user), user: user.toPublic() });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toPublic() });
});
