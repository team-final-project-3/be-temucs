-- CreateTable
CREATE TABLE "CoreBanking" (
    "CIF" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "CoreBanking_pkey" PRIMARY KEY ("CIF")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoreBanking_CIF_key" ON "CoreBanking"("CIF");
