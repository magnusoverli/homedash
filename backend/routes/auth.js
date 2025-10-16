import express from 'express';
import { ACCESS_CONTROL_ENABLED } from '../config/constants.js';
import { createToken, deleteToken, verifyToken } from '../utils/auth.js';

const router = express.Router();

router.get('/status', (_, res) => {
  res.json({
    enabled: ACCESS_CONTROL_ENABLED,
  });
});

router.post('/login', async (req, res) => {
  if (!ACCESS_CONTROL_ENABLED) {
    return res.status(400).json({
      error: 'Access control is not enabled',
    });
  }

  const { password, rememberMe = false } = req.body;

  if (!password) {
    return res.status(400).json({
      error: 'Password is required',
    });
  }

  if (password !== process.env.ACCESS_PASSWORD) {
    return res.status(401).json({
      error: 'Invalid password',
    });
  }

  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection?.remoteAddress;

  const { token, expiresAt } = await createToken(
    rememberMe,
    userAgent,
    ipAddress
  );

  res.json({
    success: true,
    token,
    expiresAt,
    rememberMe,
  });
});

router.post('/logout', async (req, res) => {
  const token = req.headers['x-access-token'];

  if (token) {
    await deleteToken(token);
  }

  res.json({ success: true });
});

router.post('/refresh', async (req, res) => {
  if (!ACCESS_CONTROL_ENABLED) {
    return res.status(400).json({
      error: 'Access control is not enabled',
    });
  }

  const oldToken = req.headers['x-access-token'];

  if (!oldToken) {
    return res.status(401).json({
      error: 'Token required for refresh',
    });
  }

  const tokenData = await verifyToken(oldToken);

  if (!tokenData) {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }

  await deleteToken(oldToken);

  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const { token, expiresAt } = await createToken(
    !!tokenData.remember_me,
    userAgent,
    ipAddress
  );

  res.json({
    success: true,
    token,
    expiresAt,
    rememberMe: !!tokenData.remember_me,
  });
});

export default router;
