import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  reservationServiceUrl: process.env.RESERVATION_SERVICE_URL || "http://localhost:4002",
  orderServiceUrl: process.env.ORDER_SERVICE_URL || "http://localhost:4003",
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || "http://localhost:4004",
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4005",
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET env var is required");
}
