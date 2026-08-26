import { Router } from "express";
import { addManualMeal, createMeal, deleteMeal } from "../controllers/meal.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// 'image' doit correspondre au nom du champ (Key) que tu enverras dans ton client de test
router.post("/", upload.single("image"), createMeal);

// Route pour ajouter un repas manuel
router.post("/manual", addManualMeal); // Route pour ajouter un repas manuel

// NOUVELLE ROUTE : La suppression avec l'ID dynamique en paramètre
router.delete('/:id', deleteMeal);

export default router;
