/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `CoreBanking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `CoreBanking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CoreBanking_email_key" ON "CoreBanking"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoreBanking_phoneNumber_key" ON "CoreBanking"("phoneNumber");
