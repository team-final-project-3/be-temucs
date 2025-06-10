const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Cek jika super admin sudah ada
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: "superadmin" },
  });

  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        name: "Super Admin",
        username: "superadmin",
        passwordHash,
        role: "superadmin",
        createdBy: "seed",
        updatedBy: "seed",
      },
    });
    console.log("Super Admin seeded: username=superadmin, password=admin123");
  } else {
    console.log("Super Admin already exists");
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
