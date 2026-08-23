import type { Request, Response } from "express";
import { generateBudgetRecipe } from "../services/ai.service.js";
import prisma from "../config/db.js";

export const getRecipe = async (req: Request, res: Response) => {
  try {
    // 1. On lit le badge secret
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId)
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant." });

    // 2. On récupère le bon profil
    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ status: "error", message: "Profil introuvable." });

    const { mealType } = req.body;
    const userGoal = profile.goal || "GENERAL_HEALTH";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. On regarde si c'est UN DE TES jours d'entraînement via la bonne clé combinée !
    const dailyRecord = await prisma.dailyTracking.findUnique({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
    });
    const isTrainingDay = dailyRecord?.isTrainingDay || false;

    // 4. On passe l'info au Chef
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
