import { Router } from "express";
import { addWater, getDailyHistory, getDailySummary, toggleTrainingDay, updateWeight } from "../controllers/daily.controller.js";

const router = Router();

// Route GET pour récupérer le résumé de la journée
router.get("/summary", getDailySummary);
router.patch("/training", toggleTrainingDay);
router.get("/history", getDailyHistory);
router.patch("/weight", updateWeight);
router.patch("/water", addWater);

export default router;