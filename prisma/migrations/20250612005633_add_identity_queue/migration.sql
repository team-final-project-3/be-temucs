/*
  Warnings:

  - Added the required column `name` to the `Queue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "name" TEXT NOT NULL;
