const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createQueueService = async (req, res) => {
    try {
        const { queueId, serviceIds, createdBy, updatedBy } = req.body;

        if (!queueId || !Array.isArray(serviceIds)) {
            return res.status(400).json({ message: "queueId and serviceIds are required" });
        }

        const dataToInsert = serviceIds.map(serviceId => ({
            queueId,
            serviceId,
            createdBy,
            updatedBy,
        }));

        const result = await prisma.queueService.createMany({
            data: dataToInsert,
        });

        res.status(201).json({ message: "QueueService created", count: result.count });
    } catch (error) {
        console.error("Create QueueService Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getDocumentsByQueueId = async (req, res) => {
    try {
        const { queueId } = req.params;
        const queueServices = await prisma.queueService.findMany({
            where: { queueId: Number(queueId) },
            select: { serviceId: true }
        });

        const serviceIds = queueServices.map(q => q.serviceId);

        if (serviceIds.length === 0) {
            return res.status(404).json({ message: "No services found for this queue" });
        }

        const documents = await prisma.document.findMany({
            where: {
                services: {
                    some: {
                        serviceId: { in: serviceIds }
                    }
                }
            },
            distinct: ['id']
        });

        res.status(200).json({ queueId: Number(queueId), documents });
    } catch (error) {
        console.error("Get Documents Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { createQueueService, getDocumentsByQueueId };