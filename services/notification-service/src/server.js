import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./database/dbConnection.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { errorMiddleware } from "./error/error.js";
import { startNotificationConsumer } from "./consumers/notificationConsumer.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "notification-service" }));
app.use("/notifications", notificationRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4005;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
    startNotificationConsumer().catch((err) =>
      console.error("Failed to start notification consumer:", err.message)
    );
  })
  .catch((err) => {
    console.error("Failed to start Notification Service", err);
    process.exit(1);
  });
