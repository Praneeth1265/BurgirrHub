import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { errorMiddleware } from "./error/error.js";
import reservationRouter from "./routes/reservationRoute.js";
import { dbConnection } from "./database/dbConnection.js";
import managerRouter from "./routes/manager.js";
import deleteRes from './routes/delete.js';
import { Reservation } from './models/reservation.js';

dotenv.config({ path: "./config/config.env" });

const app = express();

app.use(
  cors({
    origin: "https://burgirrhub.vercel.app",
    methods: ["POST", "GET", "PUT","DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/reservation", reservationRouter);
app.use("/api/reservations", deleteRes);
app.use("/api/v1/manager", managerRouter);
app.get("/api/reservations", async(req, res) => {
  try {
    const reservations = await Reservation.find();
    res.status(200).json(reservations);
} catch (error) {
    res.status(500).json({ message: 'Error retrieving reservations', error: error.message });
}
});
dbConnection();

app.use(errorMiddleware);

export default app;