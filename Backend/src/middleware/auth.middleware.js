const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // SEC-2: read from httpOnly cookie first, fallback to Authorization header
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
  }

  if (!token)
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Access denied. Please log in.' } });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user)
      return res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User no longer exists.' } });
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } });
  }
};

module.exports = { protect };
