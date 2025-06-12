const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.coreBanking.createMany({
    data: [
      {
        CIF: "CIF0010010011",
        fullname: "Marcelino Manalu",
        email: "marcelmanalu435@gmail.com",
        phoneNumber: "081234567801",
      },
      {
        CIF: "CIF0020010012",
        fullname: "Via Uni Rosa Sianipar",
        email: "viasianipar20@gmail.com",
        phoneNumber: "081234567802",
      },
      {
        CIF: "CIF0030010013",
        fullname: "Arya Pratama Anugerah Rahmadyan",
        email: "aryarahmadian@gmail.com",
        phoneNumber: "081234567803",
      },
      {
        CIF: "CIF0040010014",
        fullname: "Irene Carmenita Agatha Simatupang",
        email: "irenesimatupang011@gmail.com",
        phoneNumber: "081234567804",
      },
      {
        CIF: "CIF0050010015",
        fullname: "Kevin Willys Nathaneil Samosir",
        email: "samosirkevin873@gmail.com",
        phoneNumber: "081234567805",
      },
      {
        CIF: "CIF0060010016",
        fullname: "Jason Wijaya",
        email: "jasonwijaya2@gmail.com",
        phoneNumber: "081234567806",
      },
      {
        CIF: "CIF0070010017",
        fullname: "Okasah Rofi Izzatik",
        email: "okasahi5@gmail.com",
        phoneNumber: "081234567807",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded CoreBanking data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
