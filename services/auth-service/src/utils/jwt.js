import jwt from "jsonwebtoken";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || "7d";

export function signAccessToken(user) {
  return jwt.sign(
    // email is denormalized onto the token so downstream services (e.g.
    // Order Service, to attribute/email an order) don't need a network
    // round-trip back to Auth Service just to resolve who's calling.
    { sub: user._id.toString(), role: user.role, branchId: user.branchId, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
