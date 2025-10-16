import { ACCESS_CONTROL_ENABLED } from '../config/constants.js';
import { verifyToken } from '../utils/auth.js';

export async function requireAuth(req, res, next) {
  if (!ACCESS_CONTROL_ENABLED) {
    return next();
  }

  const token = req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const tokenData = await verifyToken(token);

  if (!tokenData) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }

  req.tokenData = tokenData;
  next();
}
