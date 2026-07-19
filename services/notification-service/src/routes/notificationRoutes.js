import { Router } from "express";
import { listNotifications } from "../controllers/notificationController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, requireRole("staff", "admin"), listNotifications);

export default router;
