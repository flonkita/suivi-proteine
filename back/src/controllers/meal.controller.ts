import type { Request, Response } from "express";
import { analyzeMealImage } from "../services/ai.service.js";
import prisma from "../config/db.js";
import { MealType } from "@prisma/client";

export const createMeal = async (req: Request, res: Response) => {
  try {
    // 1. On lit le badge secret !
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId)
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant." });

    // 2. On récupère le bon profil (le tien ou celui de ta sœur)
    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ status: "error", message: "Profil introuvable." });

    const rawType = req.body.type || "REPAS";
    const mealTypeMapper: Record<string, MealType> = {
      "PETIT-DEJ": "PETIT_DEJEUNER",
      DEJEUNER: "DEJEUNER",
      COLLATION: "COLLATION",
      DINER: "DINER",
    };
    const prismaMealType = mealTypeMapper[rawType] || "DEJEUNER";
    const userDescription = req.body.description || "";

    if (!req.file || !req.body.type) {
      return res
        .status(400)
        .json({ status: "error", message: "Photo ou type manquant." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. On récupère ou on crée la journée en la liant à ton profil
    const dailyRecord = await prisma.dailyTracking.upsert({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
      update: {},
      create: { date: today, userProfileId: profile.id },
    });

    const userGoal = profile.goal || "GENERAL_HEALTH";

    // 4. On envoie tout à l'IA
    const aiAnalysis = await analyzeMealImage(
      req.file.buffer,
      req.file.mimetype,
      req.body.type,
      dailyRecord.isTrainingDay,
      userDescription,
      userGoal,
    );

    // 5. On sauvegarde les macros
    const newMeal = await prisma.meal.create({
      data: {
        type: prismaMealType,
        foodItems: aiAnalysis.name,
        calories: aiAnalysis.calories,
        protein: aiAnalysis.proteins,
        carbs: aiAnalysis.carbs,
        fats: aiAnalysis.fats,
        isCompliant: aiAnalysis.isValid,
        dailyTrackingId: dailyRecord.id,
        comment: aiAnalysis.comment,
      },
    });

    res.status(201).json({ status: "success", data: newMeal });
  } catch (error) {
    console.error("Erreur meal.controller:", error);
    res.status(500).json({ status: "error", message: "Erreur interne." });
  }
};

export const deleteMeal = async (req: Request, res: Response) => {
  try {
    const mealId = req.params.id;
    if (typeof mealId !== "string") {
      return res
        .status(400)
        .json({ status: "error", message: "ID de repas invalide." });
    }

    await prisma.meal.delete({ where: { id: mealId } });

    res.status(200).json({
      status: "success",
      message: "L'assiette a été jetée à la poubelle, tes macros sont sauves !",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du repas:", error);
    res.status(500).json({
      status: "error",
      message:
        "Impossible de supprimer ce repas. Il n'existe peut-être pas ou l'ID est invalide.",
    });
  }
};

export const addManualMeal = async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId) {
      return res
        .status(400)
        .json({ status: "error", message: "DeviceId manquant." });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { deviceId },
    });
    if (!profile) {
      return res
        .status(404)
        .json({ status: "error", message: "Profil introuvable." });
    }

    // On récupère les infos envoyées par le bouton du téléphone
    const {
      name,
      calories,
      protein,
      carbs,
      fats,
      type = "DEJEUNER",
    } = req.body;

    const mealTypeMapper: Record<string, MealType> = {
      "PETIT-DEJ": "PETIT_DEJEUNER",
      DEJEUNER: "DEJEUNER",
      COLLATION: "COLLATION",
      DINER: "DINER",
    };
    const prismaMealType = mealTypeMapper[type] || "DEJEUNER";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // On s'assure que la journée existe
    const dailyRecord = await prisma.dailyTracking.upsert({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
      update: {},
      create: { date: today, userProfileId: profile.id },
    });

    // On crée l'assiette sans passer par l'IA
    const newMeal = await prisma.meal.create({
      data: {
        type: prismaMealType,
        foodItems: name || "Recette du Chef",
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fats: fats || 0,
        isCompliant: true, // Si le Chef IA l'a proposé, c'est validé pour la diète
        dailyTrackingId: dailyRecord.id,
        comment: "Recette cuisinée directement depuis le frigo ! 🔥",
      },
    });

    res.status(201).json({ status: "success", data: newMeal });
  } catch (error) {
    console.error("Erreur addManualMeal:", error);
    res.status(500).json({ status: "error", message: "Erreur interne." });
  }
};
