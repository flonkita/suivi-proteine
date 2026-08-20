import type { Request, Response } from "express";
import { analyzeMealImage } from "../services/ai.service.js";
import prisma from "../config/db.js";
import { MealType } from "@prisma/client";

export const createMeal = async (req: Request, res: Response) => {
  try {
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

    // 1. On récupère la journée
    const dailyRecord = await prisma.dailyTracking.upsert({
      where: { date: today },
      update: {},
      create: { date: today },
    });

    // 2. On récupère le profil pour connaître l'objectif (ATHLETIC, MUSCLE_GAIN, GENERAL_HEALTH)
    const profile = await prisma.userProfile.findFirst();
    const userGoal = profile?.goal || "GENERAL_HEALTH";

    // 3. On envoie tout à l'IA
    const aiAnalysis = await analyzeMealImage(
      req.file.buffer,
      req.file.mimetype,
      req.body.type,
      dailyRecord.isTrainingDay,
      userDescription,
      userGoal,
    );

    // 4. On sauvegarde toutes les macros dans la table Meal !
    const newMeal = await prisma.meal.create({
      data: {
        type: prismaMealType,
        foodItems: aiAnalysis.name,
        calories: aiAnalysis.calories,
        protein: aiAnalysis.proteins,
        carbs: aiAnalysis.carbs, // <-- NOUVEAU
        fats: aiAnalysis.fats, // <-- NOUVEAU
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
      return res.status(400).json({
        status: "error",
        message: "ID de repas invalide.",
      });
    }

    await prisma.meal.delete({
      where: {
        id: mealId,
      },
    });

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
