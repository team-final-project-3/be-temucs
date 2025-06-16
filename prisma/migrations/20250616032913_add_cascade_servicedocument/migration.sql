/*
  Warnings:

  - Added the required column `status` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ServiceDocument" DROP CONSTRAINT "ServiceDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceDocument" DROP CONSTRAINT "ServiceDocument_serviceId_fkey";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "status" BOOLEAN NOT NULL;

-- AddForeignKey
ALTER TABLE "ServiceDocument" ADD CONSTRAINT "ServiceDocument_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDocument" ADD CONSTRAINT "ServiceDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
