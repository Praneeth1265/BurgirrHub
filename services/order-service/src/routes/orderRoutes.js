import { Router } from "express";
import { z } from "zod";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { validate } from "../middleware/validate.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { KNOWN_BRANCHES } from "../constants/branches.js";

const router = Router();

const createOrderSchema = z.object({
  branch: z.enum(KNOWN_BRANCHES),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, "Order must contain at least one item"),
});

const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "preparing", "ready", "completed", "cancelled"]),
});

router.post("/", authenticate, validate(createOrderSchema), createOrder);
router.get("/", authenticate, listOrders);
router.get("/:id", authenticate, getOrder);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("staff", "admin"),
  validate(updateStatusSchema),
  updateOrderStatus
);

export default router;
