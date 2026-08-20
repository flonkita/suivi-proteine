-- CreateEnum
CREATE TYPE "UserGoal" AS ENUM ('GENERAL_HEALTH', 'MUSCLE_GAIN', 'ATHLETIC');

-- AlterTable
ALTER TABLE "DailyTracking" ADD COLUMN     "waterIntake" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "carbs" INTEGER,
ADD COLUMN     "fats" INTEGER;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "goal" "UserGoal" NOT NULL DEFAULT 'GENERAL_HEALTH';
