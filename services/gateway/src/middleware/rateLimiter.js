import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { config } from "../config.js";

const redisClient = new Redis(config.redisUrl);

// Shared across every gateway instance (via Redis) so horizontal scaling
// doesn't let a client bypass the limit by landing on a fresh instance.
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:global:",
  }),
});

// Stricter limit specifically on login/refresh, to slow brute-force /
// credential-stuffing attempts against the auth endpoints.
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, slow down." },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:auth:",
  }),
});
