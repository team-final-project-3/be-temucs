const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const documents = await prisma.document.createMany({
        data: [
            { documentName: "KTP", createdBy: "seed", updatedBy: "seed" },
            { documentName: "NPWP", createdBy: "seed", updatedBy: "seed" },
            { documentName: "Kartu Keluarga", createdBy: "seed", updatedBy: "seed" },
            { documentName: "Slip Gaji", createdBy: "seed", updatedBy: "seed" },
            { documentName: "Foto 3x4", createdBy: "seed", updatedBy: "seed" },
        ],
        skipDuplicates: true,
    });

    const services = await prisma.service.createMany({
        data: [
            { serviceName: "Buka Tabungan", estimatedTime: 10, createdBy: "seed", updatedBy: "seed" },
            { serviceName: "Aktivasi ATM", estimatedTime: 5, createdBy: "seed", updatedBy: "seed" },
            { serviceName: "Pengajuan Kartu Kredit", estimatedTime: 20, createdBy: "seed", updatedBy: "seed" },
            { serviceName: "Pembukaan Deposito", estimatedTime: 15, createdBy: "seed", updatedBy: "seed" },
            { serviceName: "Buka Rekening Giro", estimatedTime: 25, createdBy: "seed", updatedBy: "seed" },
        ],
        skipDuplicates: true,
    });

    const documentList = await prisma.document.findMany();
    const serviceList = await prisma.service.findMany();

    const relations = [
        { serviceName: "Buka Tabungan", documentNames: ["KTP", "Kartu Keluarga"] },
        { serviceName: "Aktivasi ATM", documentNames: ["KTP"] },
        { serviceName: "Pengajuan Kartu Kredit", documentNames: ["KTP", "NPWP", "Slip Gaji"] },
        { serviceName: "Pembukaan Deposito", documentNames: ["KTP", "NPWP"] },
        { serviceName: "Buka Rekening Giro", documentNames: ["KTP", "Foto 3x4"] },
    ];

    for (const rel of relations) {
        const service = serviceList.find((s) => s.serviceName === rel.serviceName);
        for (const docName of rel.documentNames) {
            const doc = documentList.find((d) => d.documentName === docName);
            if (service && doc) {
                await prisma.serviceDocument.create({
                    data: {
                        serviceId: service.id,
                        documentId: doc.id,
                        createdBy: "seed",
                        updatedBy: "seed",
                    },
                });
            }
        }
    }

    console.log("Seed service & document completed.");
}

main()
    .then(() => prisma.$disconnect())
    .catch((err) => {
        console.error("Seed error:", err);
        prisma.$disconnect();
        process.exit(1);
    });
