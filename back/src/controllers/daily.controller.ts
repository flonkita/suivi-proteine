import type { Request, Response } from "express";
import prisma from "../config/db.js";
import { analyzeWeightProgress } from "../services/ai.service.js";

// Fonction utilitaire pour récupérer le profil via le badge du téléphone
const getProfileFromDevice = async (req: Request, res: Response) => {
  const deviceId = req.headers["x-device-id"] as string;
  if (!deviceId) return null;
  return await prisma.userProfile.findUnique({ where: { deviceId } });
};

export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const profile = await getProfileFromDevice(req, res);
    if (!profile)
      return res
        .status(400)
        .json({
          status: "error",
          message: "DeviceId manquant ou profil introuvable",
        });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRecord = await prisma.dailyTracking.upsert({
      where: {
        date_userProfileId: { date: today, userProfileId: profile.id },
      },
      update: {},
      create: {
        date: today,
        userProfileId: profile.id, // Liaison au bon utilisateur !
      },
      include: { meals: true },
    });

    const weightToUse = dailyRecord.weight || profile.startWeight || 80;
    const goal = profile.goal || "GENERAL_HEALTH";

    let targetCalories = 2000,
      targetProteins = 150,
      targetFats = 70,
      targetCarbs = 200;

    if (goal === "ATHLETIC") {
      targetCalories = Math.round(weightToUse * 24 - 400);
      targetProteins = Math.round(weightToUse * 2.2);
      targetFats = Math.round(weightToUse * 1.0);
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    } else if (goal === "MUSCLE_GAIN") {
      targetCalories = Math.round(weightToUse * 24 + 300);
      targetProteins = Math.round(weightToUse * 2.0);
      targetFats = Math.round(weightToUse * 1.2);
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    } else {
      targetCalories = Math.round(weightToUse * 24);
      targetProteins = Math.round(weightToUse * 1.6);
      targetFats = Math.round(weightToUse * 1.0);
      targetCarbs = Math.round(
        (targetCalories - (targetProteins * 4 + targetFats * 9)) / 4,
      );
    }

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
        targets: { targetCalories, targetProteins, targetCarbs, targetFats },
        mealsCount: dailyRecord.meals.length,
        meals: dailyRecord.meals,
      },
    });
  } catch (error) {
    console.error("Erreur getDailySummary:", error);
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
    const profile = await getProfileFromDevice(req, res);
    if (!profile)
      return res
        .status(400)
        .json({ status: "error", message: "Profil introuvable" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { isTraining } = req.body;
    if (typeof isTraining !== "boolean") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Le champ isTraining doit être un booléen.",
        });
    }

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
      update: { isTrainingDay: isTraining },
      create: {
        date: today,
        isTrainingDay: isTraining,
        userProfileId: profile.id,
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
    console.error("Erreur toggleTrainingDay:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Erreur interne lors de la mise à jour.",
      });
  }
};

export const getDailyHistory = async (req: Request, res: Response) => {
  try {
    const profile = await getProfileFromDevice(req, res);
    if (!profile)
      return res
        .status(400)
        .json({ status: "error", message: "Profil introuvable" });

    const history = await prisma.dailyTracking.findMany({
      where: { userProfileId: profile.id }, // <-- TRÈS IMPORTANT : On ne voit que SON historique !
      orderBy: { date: "desc" },
      include: { meals: true },
    });

    res
      .status(200)
      .json({ status: "success", count: history.length, data: history });
  } catch (error) {
    console.error("Erreur getDailyHistory:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Impossible de récupérer l'historique.",
      });
  }
};

export const updateWeight = async (req: Request, res: Response) => {
  try {
    const profile = await getProfileFromDevice(req, res);
    if (!profile)
      return res
        .status(400)
        .json({ status: "error", message: "Profil introuvable" });

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
      where: {
        userProfileId: profile.id,
        date: { lt: today },
        weight: { not: null },
      },
      orderBy: { date: "desc" },
    });

    const aiComment = await analyzeWeightProgress(
      weight,
      previousRecord?.weight || null,
      profile.targetWeight,
      profile.goal,
      profile.targetMonths,
    );

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
      update: { weight: weight },
      create: { date: today, weight: weight, userProfileId: profile.id },
    });

    res
      .status(200)
      .json({ status: "success", message: aiComment, data: updatedRecord });
  } catch (error) {
    console.error("Erreur updateWeight:", error);
    res.status(500).json({ status: "error", message: "Erreur interne." });
  }
};

export const addWater = async (req: Request, res: Response) => {
  try {
    const profile = await getProfileFromDevice(req, res);
    if (!profile)
      return res
        .status(400)
        .json({ status: "error", message: "Profil introuvable" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedRecord = await prisma.dailyTracking.upsert({
      where: { date_userProfileId: { date: today, userProfileId: profile.id } },
      update: { waterIntake: { increment: 250 } },
      create: { date: today, waterIntake: 250, userProfileId: profile.id },
    });

    res.status(200).json({ status: "success", data: updatedRecord });
  } catch (error) {
    console.error("Erreur addWater:", error);
    res
      .status(500)
      .json({ status: "error", message: "Impossible d'ajouter l'eau." });
  }
};
