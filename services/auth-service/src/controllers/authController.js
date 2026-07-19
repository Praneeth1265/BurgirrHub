import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { ErrorHandler } from "../error/error.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In production the frontend (Vercel) and this service (EC2) are on
// different sites, so the refresh cookie needs SameSite=None to be sent
// on cross-site fetch/XHR calls -- which browsers only honor when the
// cookie is also Secure (HTTPS-only). Local dev stays "lax" since
// localhost:5173 -> localhost:8080 is same-site over plain HTTP.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Verifies a Google ID token obtained client-side (Google Identity Services),
// then finds-or-creates the local user and issues BurgirrHub's own JWTs.
// No server-side authorization-code exchange in this phase — see the
// Notion doc's Auth Service section for the full design.
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      success: true,
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(new ErrorHandler("Google authentication failed: " + error.message, 401));
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new ErrorHandler("Missing refresh token", 401));

    const payload = verifyToken(token);
    if (payload.type !== "refresh") {
      return next(new ErrorHandler("Invalid token type", 401));
    }

    const user = await User.findById(payload.sub);
    if (!user) return next(new ErrorHandler("User not found", 401));

    const accessToken = signAccessToken(user);
    res.status(200).json({ success: true, accessToken });
  } catch (error) {
    next(new ErrorHandler("Invalid or expired refresh token", 401));
  }
};

export const logout = async (req, res) => {
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ success: true, message: "Logged out" });
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return next(new ErrorHandler("User not found", 404));

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    });
  } catch (error) {
    next(error);
  }
};
