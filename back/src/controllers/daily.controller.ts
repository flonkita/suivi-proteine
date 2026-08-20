import type { Request, Response } from "express";
import prisma from "../config/db.js";
import { analyzeWeightProgress } from "../services/ai.service.js";

export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRecord = await prisma.dailyTracking.upsert({
      where: { date: today },
      update: {},
      create: { date: today },
      include: { meals: true },
    });

    // 1. Récupération du profil pour les calculs
    const profile = await prisma.userProfile.findFirst();
    const weightToUse = dailyRecord.weight || profile?.startWeight || 80;
    const goal = profile?.goal || "GENERAL_HEALTH";

    // 2. CALCUL DYNAMIQUE DES MACROS CIBLES
    let targetCalories = 2000,
      targetProteins = 150,
      targetFats = 70,
      targetCarbs = 200;

    if (goal === "ATHLETIC") {
      // Ton mode : Déficit calorique pour voler vers l'arceau, protéines massives
      targetCalories = Math.round(weightToUse * 24 - 400);
      targetProteins = Math.round(weightToUse * 2.2); // 2.2g par kilo
      targetFats = Math.round(weightToUse * 1.0); // 1g par kilo
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    } else if (goal === "MUSCLE_GAIN") {
      // Prise de masse : Léger surplus
      targetCalories = Math.round(weightToUse * 24 + 300);
      targetProteins = Math.round(weightToUse * 2.0);
      targetFats = Math.round(weightToUse * 1.2);
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    } else {
      // Santé : Maintien et équilibre
      targetCalories = Math.round(weightToUse * 24);
      targetProteins = Math.round(weightToUse * 1.6);
      targetFats = Math.round(weightToUse * 1.0);
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    }

    // 3. Calcul du total consommé
    const totalCalories = dailyRecord.meals.reduce(
      (sum, meal) => sum + (meal.calories || 0),
      0,
    );
    const totalProteins = dailyRecord.meals.reduce(
      (sum, meal) => sum + (meal.protein || 0),
      0,
    );
    const totalCarbs = dailyRecord.meals.reduce(
      (sum, meal) => sum + (meal.carbs || 0),
      0,
    );
    const totalFats = dailyRecord.meals.reduce(
      (sum, meal) => sum + (meal.fats || 0),
      0,
    );

    res.status(200).json({
      status: "success",
      data: {
        id: dailyRecord.id,
        date: dailyRecord.date,
        isTrainingDay: dailyRecord.isTrainingDay,
        waterIntake: dailyRecord.waterIntake,
        macros: { totalCalories, totalProteins, totalCarbs, totalFats },
        targets: { targetCalories, targetProteins, targetCarbs, targetFats }, // <-- ON ENVOIE LES CIBLES !
        mealsCount: dailyRecord.meals.length,
        meals: dailyRecord.meals,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "Impossible de récupérer les données du jour.",
      });
  }
};

export const toggleTrainingDay = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { isTraining } = req.body;
    if (typeof isTraining !== "boolean") {
      return res.status(400).json({
        status: "error",
        message: "Le champ isTraining doit être un booléen (true ou false).",
      });
    }

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date: today },
      update: { isTrainingDay: isTraining },
      create: {
        date: today,
        isTrainingDay: isTraining,
      },
    });

    res.status(200).json({
      status: "success",
      message: isTraining
        ? "Mode entraînement activé ! La collation de récupération est autorisée."
        : "Mode repos activé. On resserre la diète !",
      data: updatedRecord,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour du jour d'entraînement:",
      error,
    );
    res.status(500).json({
      status: "error",
      message: "Erreur interne lors de la mise à jour du statut.",
    });
  }
};

export const getDailyHistory = async (req: Request, res: Response) => {
  try {
    const history = await prisma.dailyTracking.findMany({
      orderBy: {
        date: "desc",
      },
      include: {
        meals: true,
      },
    });

    res.status(200).json({
      status: "success",
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
    res.status(500).json({
      status: "error",
      message: "Impossible de récupérer l'historique des journées.",
    });
  }
};

export const updateWeight = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { weight } = req.body;

    if (typeof weight !== "number") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Le poids doit être un nombre valide.",
        });
    }

    const previousRecord = await prisma.dailyTracking.findFirst({
      where: { date: { lt: today }, weight: { not: null } },
      orderBy: { date: "desc" },
    });

    // 1. On récupère le profil pour avoir le poids cible ET le but de l'utilisateur
    const profile = await prisma.userProfile.findFirst();
    const targetWeight = profile ? profile.targetWeight : 95.0;
    const userGoal = profile ? profile.goal : "GENERAL_HEALTH"; // <-- On récupère l'objectif
    const targetMonths = profile ? profile.targetMonths : 4;

    // 2. On passe l'objectif en 4ème argument à l'IA !
    const aiComment = await analyzeWeightProgress(
      weight,
      previousRecord?.weight || null,
      targetWeight,
      userGoal,
      targetMonths, // <-- On passe le délai en mois à l'IA
    );

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date: today },
      update: { weight: weight },
      create: { date: today, weight: weight },
    });

    res.status(200).json({
      status: "success",
      message: aiComment,
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du poids:", error);
    res.status(500).json({ status: "error", message: "Erreur interne." });
  }
};

// 2. NOUVELLE FONCTION : Ajouter un verre d'eau (250ml)
export const addWater = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date: today },
      update: { waterIntake: { increment: 250 } }, // On ajoute 250ml
      create: { date: today, waterIntake: 250 },
    });

    res.status(200).json({ status: "success", data: updatedRecord });
  } catch (error) {
    console.error("Erreur eau:", error);
    res.status(500).json({ status: "error", message: "Impossible d'ajouter l'eau." });
  }
};
