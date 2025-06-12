/*
  Warnings:

  - You are about to drop the `ServicesDocuments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ServicesDocuments" DROP CONSTRAINT "ServicesDocuments_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ServicesDocuments" DROP CONSTRAINT "ServicesDocuments_queueId_fkey";

-- DropForeignKey
ALTER TABLE "ServicesDocuments" DROP CONSTRAINT "ServicesDocuments_serviceId_fkey";

-- DropTable
DROP TABLE "ServicesDocuments";

-- CreateTable
CREATE TABLE "ServiceDocument" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ServiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueService" (
    "id" SERIAL NOT NULL,
    "queueId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "QueueService_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceDocument" ADD CONSTRAINT "ServiceDocument_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDocument" ADD CONSTRAINT "ServiceDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueService" ADD CONSTRAINT "QueueService_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueService" ADD CONSTRAINT "QueueService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
