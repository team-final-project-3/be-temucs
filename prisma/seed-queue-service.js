import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const queueId = 4;

  // Seed for serviceId = 7
  await prisma.queueService.create({
    data: {
      queueId: queueId,
      serviceId: 7,
      createdBy: "seed",
      updatedBy: "seed",
    },
  });

  // Seed for serviceId = 8
  await prisma.queueService.create({
    data: {
      queueId: queueId,
      serviceId: 8,
      createdBy: "seed",
      updatedBy: "seed",
    },
  });

  console.log("QueueService seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
