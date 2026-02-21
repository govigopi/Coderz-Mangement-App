const authService = require('../services/authService');
const User = require('../models/User');

function getRoleFromRequest(req) {
  const roleFromBody = req.body?.role;
  return roleFromBody ? String(roleFromBody).trim().toLowerCase() : undefined;
}

async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const role = getRoleFromRequest(req);
    const result = await authService.login({
      email,
      password,
      rememberMe: Boolean(rememberMe),
      requiredRole: role === 'superadmin' || role === 'admin' || role === 'staff' ? role : undefined,
    });
    return res.json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function adminLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await authService.login({ email, password, rememberMe: Boolean(rememberMe), requiredRole: 'admin' });
    return res.json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function superadminLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await authService.login({ email, password, rememberMe: Boolean(rememberMe), requiredRole: 'superadmin' });
    return res.json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function staffLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await authService.login({ email, password, rememberMe: Boolean(rememberMe), requiredRole: 'staff' });
    return res.json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body || {};
    const result = await authService.refreshSession({ refreshToken });
    return res.json(result);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body || {};
    await authService.logout({ refreshToken });
    return res.json({ message: 'Logged out.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function me(req, res) {
  return res.json({ user: authService.sanitizeUser(req.user) });
}

async function register(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const requestedRole = String(req.body?.role || 'staff').toLowerCase();

    if (!['admin', 'staff'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Only admin/staff roles can be created here.' });
    }
    if (requesterRole === 'admin' && requestedRole !== 'staff') {
      return res.status(403).json({ error: 'Admin can create only staff users.' });
    }

    const result = await authService.register({ ...req.body, role: requestedRole });
    return res.status(201).json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function listManagedUsers(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const filter = requesterRole === 'superadmin'
      ? { role: { $in: ['admin', 'staff'] } }
      : { role: 'staff' };

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });
    return res.json(users.map((u) => authService.sanitizeUser(u)));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updateManagedUser(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!['admin', 'staff'].includes(user.role)) return res.status(400).json({ error: 'Only admin/staff users can be updated here.' });
    if (requesterRole === 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin can update only staff users.' });
    }

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password === undefined ? undefined : String(req.body.password);
    const nextRole = req.body?.role === undefined ? user.role : String(req.body.role).toLowerCase();

    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!['admin', 'staff'].includes(nextRole)) return res.status(400).json({ error: 'Role must be admin or staff.' });
    if (requesterRole === 'admin' && nextRole !== 'staff') {
      return res.status(403).json({ error: 'Admin can assign only staff role.' });
    }

    const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailExists) return res.status(400).json({ error: 'Email already in use.' });

    user.name = name;
    user.email = email;
    if (password !== undefined && password.trim()) {
      user.password = password;
    }
    user.role = nextRole;

    await user.save();
    return res.json(authService.sanitizeUser(user));
  } catch (e) {
    if (e?.code === 11000 && e?.keyPattern?.email) {
      return res.status(400).json({ error: 'Email already in use.' });
    }
    return res.status(400).json({ error: e.message });
  }
}

async function deleteManagedUser(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!['admin', 'staff'].includes(user.role)) return res.status(400).json({ error: 'Only admin/staff users can be deleted here.' });
    if (requesterRole === 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin can delete only staff users.' });
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'User deleted.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = {
  login,
  superadminLogin,
  adminLogin,
  staffLogin,
  refresh,
  logout,
  me,
  register,
  listManagedUsers,
  updateManagedUser,
  deleteManagedUser,
};

