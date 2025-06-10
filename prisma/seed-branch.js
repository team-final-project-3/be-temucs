const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const branches = [
    {
      name: "Branch Jakarta Kota Tua",
      branchCode: "JKT001",
      regionCode: "JKT",
      longitude: 106.8272,
      latitude: -6.1751,
      holiday: false,
      status: true,
      createdBy: "seed",
      updatedBy: "seed",
    },
    {
      name: "Bank BNI Petamburan",
      branchCode: "JKT002",
      regionCode: "JKT",
      longitude: 106.801,
      latitude: -6.187,
      holiday: false,
      status: true,
      createdBy: "seed",
      updatedBy: "seed",
    },
    {
      name: "BNI TANAH ABANG BLOK B2",
      branchCode: "JKT003",
      regionCode: "JKT",
      longitude: 106.8186,
      latitude: -6.1858,
      holiday: false,
      status: true,
      createdBy: "seed",
      updatedBy: "seed",
    },
  ];

  for (const branch of branches) {
    const exists = await prisma.branch.findUnique({
      where: { branchCode: branch.branchCode },
    });
    if (!exists) {
      await prisma.branch.create({ data: branch });
      console.log(`Branch seeded: ${branch.name}`);
    } else {
      console.log(`Branch already exists: ${branch.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
