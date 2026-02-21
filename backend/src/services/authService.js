const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_SHORT = process.env.REFRESH_TOKEN_EXPIRY_SHORT || '1d';
const REFRESH_TOKEN_EXPIRY_LONG = process.env.REFRESH_TOKEN_EXPIRY_LONG || '30d';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  return value === 'proprietor' ? 'superadmin' : value;
}

async function migrateLegacyRole(user) {
  const normalizedRole = normalizeRole(user?.role);
  if (normalizedRole && user.role !== normalizedRole) {
    user.role = normalizedRole;
    await user.save();
  }
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
  };
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: normalizeRole(user.role), type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueSessionTokens(user, rememberMe = false) {
  await migrateLegacyRole(user);
  const refreshExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_LONG : REFRESH_TOKEN_EXPIRY_SHORT;
  const refreshToken = jwt.sign(
    { id: user._id.toString(), role: normalizeRole(user.role), type: 'refresh', rememberMe: Boolean(rememberMe) },
    REFRESH_SECRET,
    { expiresIn: refreshExpiry }
  );
  const decodedRefresh = jwt.verify(refreshToken, REFRESH_SECRET);
  const refreshTokenExpiresAt = new Date(decodedRefresh.exp * 1000);

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = refreshTokenExpiresAt;
  await user.save();

  return {
    token: signAccessToken(user),
    refreshToken,
    user: sanitizeUser(user),
  };
}

async function login({ email, password, requiredRole, rememberMe }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  if (requiredRole && normalizeRole(user.role) !== normalizeRole(requiredRole)) {
    const err = new Error(`This account is not allowed for ${requiredRole} login.`);
    err.status = 403;
    throw err;
  }

  return issueSessionTokens(user, rememberMe);
}

async function refreshSession({ refreshToken }) {
  const token = String(refreshToken || '').trim();
  if (!token) {
    const err = new Error('Refresh token is required.');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token.');
    err.status = 401;
    throw err;
  }

  if (decoded.type !== 'refresh') {
    const err = new Error('Invalid token type.');
    err.status = 401;
    throw err;
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    const err = new Error('Session expired. Please login again.');
    err.status = 401;
    throw err;
  }

  const isMatch = user.refreshTokenHash === hashToken(token);
  const notExpired = user.refreshTokenExpiresAt.getTime() > Date.now();
  if (!isMatch || !notExpired) {
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await user.save();
    const err = new Error('Session expired. Please login again.');
    err.status = 401;
    throw err;
  }

  return issueSessionTokens(user, Boolean(decoded.rememberMe));
}

async function logout({ refreshToken }) {
  const token = String(refreshToken || '').trim();
  if (!token) return;
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (!decoded?.id) return;
    const user = await User.findById(decoded.id);
    if (!user) return;
    if (user.refreshTokenHash && user.refreshTokenHash === hashToken(token)) {
      user.refreshTokenHash = null;
      user.refreshTokenExpiresAt = null;
      await user.save();
    }
  } catch {
    // Ignore invalid/expired refresh token during logout.
  }
}

async function register(payload) {
  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('Email already in use.');
    err.status = 400;
    throw err;
  }

  const user = new User({ ...payload, email: normalizedEmail, role: normalizeRole(payload.role) });
  try {
    await user.save();
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.email) {
      const err = new Error('Email already in use.');
      err.status = 400;
      throw err;
    }
    throw e;
  }

  return issueSessionTokens(user, false);
}

module.exports = {
  login,
  refreshSession,
  logout,
  register,
  sanitizeUser,
};
