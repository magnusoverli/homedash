import crypto from 'crypto';
import { runQuery, getOne } from '../database.js';
import { TOKEN_EXPIRY_SHORT, TOKEN_EXPIRY_LONG } from '../config/constants.js';

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createToken(
  rememberMe,
  userAgent = null,
  ipAddress = null
) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (rememberMe ? TOKEN_EXPIRY_LONG : TOKEN_EXPIRY_SHORT)
  );

  await runQuery(
    `INSERT INTO auth_tokens (token, remember_me, created_at, expires_at, last_used_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      token,
      rememberMe ? 1 : 0,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      userAgent,
      ipAddress,
    ]
  );

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyToken(token) {
  const result = await getOne(
    'SELECT * FROM auth_tokens WHERE token = ? AND expires_at > datetime("now")',
    [token]
  );

  if (!result) {
    return null;
  }

  await runQuery('UPDATE auth_tokens SET last_used_at = ? WHERE token = ?', [
    new Date().toISOString(),
    token,
  ]);

  return result;
}

export async function deleteToken(token) {
  await runQuery('DELETE FROM auth_tokens WHERE token = ?', [token]);
}

export async function cleanupExpiredTokens() {
  try {
    const result = await runQuery(
      'DELETE FROM auth_tokens WHERE expires_at < datetime("now")',
      []
    );
    console.log(`🧹 Cleaned up ${result.changes} expired tokens`);
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}
