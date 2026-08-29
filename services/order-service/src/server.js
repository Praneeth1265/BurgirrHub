import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./database/dbConnection.js";
import { seedMenu } from "./seed/seedMenu.js";
import orderRoutes from "./routes/orderRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import { errorMiddleware } from "./error/error.js";
import { startPaymentEventsConsumer } from "./consumers/paymentEventsConsumer.js";
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
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "order-service" }));
app.use("/orders", orderRoutes);
app.use("/menu", menuRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4003;

connectDB()
  .then(seedMenu)
  .then(() => {
    app.listen(PORT, () => console.log(`Order Service listening on port ${PORT}`));
    // Fire-and-forget: a transient RabbitMQ outage shouldn't prevent the
    // HTTP server itself from coming up and serving requests.
    startWithRetry("payment events consumer", startPaymentEventsConsumer);
  })
  .catch((err) => {
    console.error("Failed to start Order Service", err);
    process.exit(1);
  });
