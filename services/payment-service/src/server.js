import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./database/dbConnection.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleWebhook } from "./controllers/paymentController.js";
import { errorMiddleware } from "./error/error.js";
import { startOrderEventsConsumer } from "./consumers/orderEventsConsumer.js";
import { startWithRetry } from "./utils/amqpRetry.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Must be registered before express.json() below, and needs its own raw
// body parser -- Stripe's signature check is computed over the exact raw
// request bytes, and a parsed-then-reserialized JSON object won't match.
// The Gateway also never parses request bodies (Phase 1 decision, for the
// same reason applied to proxying in general), so these bytes arrive here
// completely untouched all the way from Stripe's own request.
app.post("/payments/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "payment-service" }));
app.use("/payments", paymentRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4004;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Payment Service listening on port ${PORT}`));
    startWithRetry("order events consumer", startOrderEventsConsumer);
  })
  .catch((err) => {
    console.error("Failed to start Payment Service", err);
    process.exit(1);
  });
