import jwt from "jsonwebtoken";

// Independent JWT verification, not just trust in the Gateway having
// already checked it -- each service verifies for itself (defense in
// depth, and each service stays independently deployable/testable).
// Uses the same shared JWT_SECRET as the Gateway and Auth Service
// (Phase 1's documented simplification).
export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Missing bearer token" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient role" });
    }
    next();
  };
}
