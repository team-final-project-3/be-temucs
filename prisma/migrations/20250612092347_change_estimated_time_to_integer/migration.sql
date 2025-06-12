/*
  Warnings:

  - The `estimatedTime` column on the `Queue` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "estimatedTime",
ADD COLUMN     "estimatedTime" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "estimatedTime" INTEGER;
