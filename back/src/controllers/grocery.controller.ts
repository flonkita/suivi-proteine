import type { Request, Response } from "express";
import { analyzeGroceryImage } from "../services/ai.service.js";
import prisma from "../config/db.js";

export const scanGroceryItem = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "Aucune photo reçue." });
    }

    // 1. Lecture du badge secret pour le supermarché !
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId) {
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant." });
    }

    // 2. Identification de TON profil
    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });

    if (!profile) {
      return res
        .status(404)
        .json({ status: "error", message: "Profil introuvable." });
    }

    // 3. On utilise TON objectif
    const userGoal = profile.goal || "GENERAL_HEALTH";

    const aiAnalysis = await analyzeGroceryImage(
      req.file.buffer,
      req.file.mimetype,
      userGoal,
    );

    res.status(200).json({ status: "success", data: aiAnalysis });
  } catch (error) {
    console.error("Erreur Grocery Scanner:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur lors de l'analyse du produit.",
    });
  }
};
