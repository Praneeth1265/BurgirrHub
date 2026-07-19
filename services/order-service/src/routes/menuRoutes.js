import { Router } from "express";
import { listMenu, getMenuItem } from "../controllers/menuController.js";

const router = Router();

router.get("/", listMenu);
router.get("/:id", getMenuItem);

export default router;
