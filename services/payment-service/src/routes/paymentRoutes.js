import { Router } from "express";
import { z } from "zod";
import { createIntent, confirmDummyUpi } from "../controllers/paymentController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const confirmUpiSchema = z.object({
  upiId: z.string().min(3).max(80),
});

router.post("/:orderId/intent", authenticate, createIntent);
router.post("/:orderId/confirm-dummy-upi", authenticate, validate(confirmUpiSchema), confirmDummyUpi);

export default router;
