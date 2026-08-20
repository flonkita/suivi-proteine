import { type Request, type Response } from "express";
import prisma from "../config/db.js";

export const createDailyTracking = async (req: Request, res: Response) => {
  try {
    const { weight, isTrainingDay } = req.body;

    // On utilise la date du jour, remise à minuit pour éviter les doublons
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // On utilise upsert : met à jour si la journée existe déjà, sinon la crée
    const dailyRecord = await prisma.dailyTracking.upsert({
      where: {
        date: today,
      },
      update: {
        weight,
        isTrainingDay,
      },
      create: {
        date: today,
        weight,
        isTrainingDay,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Journée initialisée avec succès.",
      data: dailyRecord,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la journée:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur interne du serveur",
    });
  }
};
