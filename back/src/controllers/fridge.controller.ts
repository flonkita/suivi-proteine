import type { Request, Response } from "express";
import prisma from "../config/db.js";
import { analyzeFridgeAndGenerateRecipe } from "../services/ai.service.js";

const getProfileFromDevice = async (req: Request) => {
  const deviceId = req.headers["x-device-id"] as string;
  if (!deviceId) return null;
  return await prisma.userProfile.findUnique({ where: { deviceId } });
};

export const scanFridge = async (req: Request, res: Response) => {
  try {
    const profile = await getProfileFromDevice(req);
    if (!profile) {
      return res.status(400).json({
        status: "error",
        message: "DeviceId manquant ou profil introuvable.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Aucune photo du frigo ou placard fournie.",
      });
    }

    const { mealType = "Dîner", isTrainingDay = "false" } = req.body;
    const isTraining = isTrainingDay === "true" || isTrainingDay === true;

    const result = await analyzeFridgeAndGenerateRecipe(
      req.file.buffer,
      req.file.mimetype,
      profile.goal || "GENERAL_HEALTH",
      mealType,
      isTraining,
    );

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Erreur scanFridge:", error);
    return res.status(500).json({
      status: "error",
      message: "Impossible d'analyser la photo du frigo.",
    });
  }
};
