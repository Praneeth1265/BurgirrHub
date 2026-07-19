import { Router } from "express";
import { createIntent } from "../controllers/paymentController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.post("/:orderId/intent", authenticate, createIntent);

export default router;
