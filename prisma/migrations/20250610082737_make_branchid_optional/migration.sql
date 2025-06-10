-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_branchId_fkey";

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "branchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
