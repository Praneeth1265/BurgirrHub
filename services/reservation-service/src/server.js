import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./database/dbConnection.js";
import { seedBranches } from "./seed/seedBranches.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import { errorMiddleware } from "./error/error.js";

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

app.get("/health", (req, res) => res.json({ status: "ok", service: "reservation-service" }));
app.use("/reservations", reservationRoutes);
app.use("/branches", branchRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4002;

connectDB()
  .then(seedBranches)
  .then(() => {
    app.listen(PORT, () => console.log(`Reservation Service listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start Reservation Service", err);
    process.exit(1);
  });
