import type { Request, Response } from "express";
import { generateBudgetRecipe } from "../services/ai.service.js";
import prisma from "../config/db.js";

export const getRecipe = async (req: Request, res: Response) => {
  try {
    const { mealType } = req.body;

    // 1. On récupère le profil
    const profile = await prisma.userProfile.findFirst();
    const userGoal = profile?.goal || "GENERAL_HEALTH";

    // 2. NOUVEAU : On regarde si c'est un jour d'entraînement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRecord = await prisma.dailyTracking.findUnique({
      where: { date: today },
    });
    const isTrainingDay = dailyRecord?.isTrainingDay || false;

    // 3. On passe l'info au Chef
    const recipe = await generateBudgetRecipe(
      userGoal,
      mealType || "Déjeuner",
      isTrainingDay,
    );

    res.status(200).json({ status: "success", data: recipe });
  } catch (error) {
    console.error("Erreur Recipe Generator:", error);
    res
      .status(500)
      .json({ status: "error", message: "Le chef a brûlé le plat." });
  }
};
