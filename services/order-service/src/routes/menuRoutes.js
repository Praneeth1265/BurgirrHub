import { Router } from "express";
import { z } from "zod";
import { listMenu, getMenuItem, updateMenuItem } from "../controllers/menuController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const updateMenuItemSchema = z.object({
  stock: z.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
  price: z.number().min(0).optional(),
});

router.get("/", listMenu);
router.get("/:id", getMenuItem);
router.patch(
  "/:id",
  authenticate,
  requireRole("staff", "admin"),
  validate(updateMenuItemSchema),
  updateMenuItem
);

export default router;
