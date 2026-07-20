import { Router } from "express";
import { z } from "zod";
import { listBranches, getBranch, updateBranch } from "../controllers/branchController.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const updateBranchSchema = z.object({
  availableSeats: z.number().int().min(0).optional(),
  capacity: z.number().int().min(1).optional(),
});

router.get("/", listBranches);
router.get("/:id", getBranch);
router.patch("/:id", authenticate, requireRole("staff", "admin"), validate(updateBranchSchema), updateBranch);

export default router;
