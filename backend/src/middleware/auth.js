import jwt from 'jsonwebtoken';

// ── verifyToken ─────────────────────────────────────────────────────────────
// Validates the Bearer token in Authorization header.
// On success, attaches decoded payload to req.user and calls next().
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid token.';
    return res.status(401).json({ message });
  }
};

// ── requireRole ─────────────────────────────────────────────────────────────
// Factory middleware — use after verifyToken.
// Usage: requireRole('admin')  or  requireRole('organiser', 'admin')
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
};
