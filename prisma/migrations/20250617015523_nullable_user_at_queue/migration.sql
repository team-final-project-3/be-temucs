-- DropForeignKey
ALTER TABLE "Queue" DROP CONSTRAINT "Queue_userId_fkey";

-- AlterTable
ALTER TABLE "Queue" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
