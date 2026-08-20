import { Router } from "express";
import { getRecipe } from "../controllers/recipe.controller.js";

const router = Router();
router.post("/generate", getRecipe);

export default router;
