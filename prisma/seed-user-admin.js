const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullname: "Admin Utama",
      username: "admin",
      passwordHash,
      role: "admin",
      email: "admin@bni.co.id",
      phoneNumber: "081234567890",
    },
  });

  console.log("Seeded admin user:", adminUser.username, "/ password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
