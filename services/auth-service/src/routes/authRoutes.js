import { Router } from "express";
import { z } from "zod";
import { googleLogin, refresh, logout, me } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const googleLoginSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

router.post("/google", validate(googleLoginSchema), googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
