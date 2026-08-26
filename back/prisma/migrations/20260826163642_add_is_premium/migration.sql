/*
  Warnings:

  - A unique constraint covering the columns `[date,userProfileId]` on the table `DailyTracking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceId]` on the table `UserProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userProfileId` to the `DailyTracking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceId` to the `UserProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DailyTracking_date_key";

-- AlterTable
ALTER TABLE "DailyTracking" ADD COLUMN     "userProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "currentWeight" DOUBLE PRECISION,
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DailyTracking_date_userProfileId_key" ON "DailyTracking"("date", "userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_deviceId_key" ON "UserProfile"("deviceId");

-- AddForeignKey
ALTER TABLE "DailyTracking" ADD CONSTRAINT "DailyTracking_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
