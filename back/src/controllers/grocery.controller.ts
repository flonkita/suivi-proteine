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

    // On récupère l'objectif de l'utilisateur pour adapter le jugement
    const profile = await prisma.userProfile.findFirst();
    const userGoal = profile?.goal || "GENERAL_HEALTH";

    const aiAnalysis = await analyzeGroceryImage(
      req.file.buffer,
      req.file.mimetype,
      userGoal,
    );

    res.status(200).json({ status: "success", data: aiAnalysis });
  } catch (error) {
    console.error("Erreur Grocery Scanner:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Erreur lors de l'analyse du produit.",
      });
  }
};
