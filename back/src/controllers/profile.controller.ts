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
    // On lit le badge du téléphone
    const deviceId = req.headers["x-device-id"] as string;

    if (!deviceId) {
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant" });
    }

    // On cherche UNIQUEMENT le profil lié à ce téléphone
    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });

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
    const deviceId = req.headers["x-device-id"] as string;

    if (!deviceId) {
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant" });
    }

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

    // Upsert : S'il existe, on met à jour. Sinon, on le crée AVEC le deviceId.
    const profile = await prisma.userProfile.upsert({
      where: { deviceId },
      update: updateData,
      create: {
        deviceId,
        name: parsedData.name ?? "Athlète",
        startWeight: parsedData.startWeight ?? 120.0,
        currentWeight: parsedData.startWeight ?? 120.0,
        targetWeight: parsedData.targetWeight ?? 90.0,
        targetMonths: parsedData.targetMonths ?? 4,
        goal: parsedData.goal ?? "GENERAL_HEALTH",
      },
    });

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
    res
      .status(500)
      .json({
        status: "error",
        message: "Erreur interne lors de la mise à jour.",
      });
  }
};