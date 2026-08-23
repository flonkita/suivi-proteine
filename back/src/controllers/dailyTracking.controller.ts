import { type Request, type Response } from "express";
import prisma from "../config/db.js";

export const createDailyTracking = async (req: Request, res: Response) => {
  try {
    const { weight, isTrainingDay } = req.body;

    // 1. Lecture du badge
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId)
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant" });

    // 2. Recherche du propriétaire
    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ status: "error", message: "Profil introuvable" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. Upsert avec la bonne liaison
    const dailyRecord = await prisma.dailyTracking.upsert({
      where: {
        date_userProfileId: { date: today, userProfileId: profile.id },
      },
      update: {
        weight,
        isTrainingDay,
      },
      create: {
        date: today,
        weight,
        isTrainingDay,
        userProfileId: profile.id, // <-- Indispensable !
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
