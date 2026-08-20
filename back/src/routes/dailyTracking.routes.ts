import { Router } from "express";
import { createDailyTracking } from "../controllers/dailyTracking.controller.js";

const router = Router();

// Route POST pour créer ou mettre à jour la journée
router.post("/", createDailyTracking);

export default router;
