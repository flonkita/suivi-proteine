import type { Request, Response } from "express";
import prisma from "../config/db.js";
import { z } from "zod";

// 1. Définition du schéma de validation strict (Le Videur Zod)
const updateGoalSchema = z.object({
  name: z.string().optional(), // <--- LA CORRECTION EST ICI ! On autorise l'ingrédient.
  startWeight: z.number().min(40).max(300).optional(),
  targetWeight: z.number().min(40).max(300).optional(),
  targetMonths: z.number().min(1).max(60).optional(),
  goal: z.enum(["GENERAL_HEALTH", "MUSCLE_GAIN", "ATHLETIC"]).optional(),
});

export const getProfile = async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findFirst();

    res.status(200).json({ status: "success", data: profile });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({
      status: "error",
      message: "Impossible de récupérer les objectifs.",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // TypeScript sait maintenant que parsedData peut contenir "name"
    const parsedData = updateGoalSchema.parse(req.body);

    const updateData = {
      ...(parsedData.name !== undefined && { name: parsedData.name }),
      ...(parsedData.startWeight !== undefined && {
        startWeight: parsedData.startWeight,
      }),
      ...(parsedData.targetWeight !== undefined && {
        targetWeight: parsedData.targetWeight,
      }),
      ...(parsedData.targetMonths !== undefined && {
        targetMonths: parsedData.targetMonths,
      }),
      ...(parsedData.goal !== undefined && { goal: parsedData.goal }),
    };

    let profile = await prisma.userProfile.findFirst();

    if (profile) {
      profile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
    } else {
      profile = await prisma.userProfile.create({
        data: {
          name: parsedData.name ?? "Athlète", // <--- On ajoute le nom par défaut ici aussi
          startWeight: parsedData.startWeight ?? 125.0,
          targetWeight: parsedData.targetWeight ?? 95.0,
          targetMonths: parsedData.targetMonths ?? 4,
          goal: parsedData.goal ?? "GENERAL_HEALTH",
        },
      });
    }

    res.status(200).json({ status: "success", data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Format de données invalide.",
        details: error.issues,
      });
    }

    console.error("Erreur lors de la mise à jour du profil:", error);
    res.status(500).json({
      status: "error",
      message: "Erreur interne lors de la mise à jour.",
    });
  }
};
