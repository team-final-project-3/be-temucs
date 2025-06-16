const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    await prisma.queue.createMany({
        data: [
            {
                userId: 1,
                branchId: 5,
                csId: null,
                loketId: null,
                bookingDate: new Date(),
                ticketNumber: "A001",
                name: "Budi Santoso",
                email: "budi@example.com",
                phoneNumber: "081234567890",
                status: "waiting",
                createdBy: "seed",
                updatedBy: "seed"
            },
            {
                userId: 2,
                branchId: 5,
                csId: null,
                loketId: null,
                bookingDate: new Date(),
                ticketNumber: "A002",
                name: "Siti Aminah",
                email: "siti@example.com",
                phoneNumber: "082345678901",
                status: "inprogress",
                createdBy: "seed",
                updatedBy: "seed"
            },
            {
                userId: 3,
                branchId: 5,
                csId: null,
                loketId: null,
                bookingDate: new Date(),
                ticketNumber: "A003",
                name: "Joko Widodo",
                email: "joko@example.com",
                phoneNumber: "083456789012",
                status: "done",
                createdBy: "seed",
                updatedBy: "seed"
            }
        ]
    });

    console.log("Queue seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
