import { Router } from "express";
import { z } from "zod";
import {
  createReservation,
  listReservations,
  deleteReservation,
} from "../controllers/reservationController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

const router = Router();

const createReservationSchema = z.object({
  firstName: z.string().min(3, "firstName must be at least 3 characters").max(30),
  lastName: z.string().min(3, "lastName must be at least 3 characters").max(30),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .length(10, "Phone must be exactly 10 digits")
    .regex(/^\d+$/, "Phone must contain only digits"),
  date: z.string().min(1, "date is required"),
  time: z.string().min(1, "time is required"),
  branchId: z.string().min(1, "branchId is required"),
});

router.post("/", validate(createReservationSchema), createReservation);
router.get("/", authenticate, requireRole("staff", "admin"), listReservations);
router.delete("/:id", authenticate, requireRole("staff", "admin"), deleteReservation);

export default router;
