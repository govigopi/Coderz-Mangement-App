function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient role permissions.' });
    }

    next();
  };
}

module.exports = authorizeRoles;
