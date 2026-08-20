-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('PETIT_DEJEUNER', 'DEJEUNER', 'COLLATION', 'DINER');

-- CreateTable
CREATE TABLE "DailyTracking" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "isTrainingDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "foodItems" TEXT NOT NULL,
    "calories" INTEGER,
    "protein" INTEGER,
    "isCompliant" BOOLEAN NOT NULL DEFAULT true,
    "dailyTrackingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyTracking_date_key" ON "DailyTracking"("date");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_dailyTrackingId_fkey" FOREIGN KEY ("dailyTrackingId") REFERENCES "DailyTracking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
