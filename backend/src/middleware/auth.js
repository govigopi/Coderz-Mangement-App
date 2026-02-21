const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type && decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid access token.' });
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticate;
