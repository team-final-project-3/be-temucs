const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createQueueService = async (req, res, next) => {
  try {
    const { queueId, serviceIds, createdBy, updatedBy } = req.body;

    if (!queueId || !Array.isArray(serviceIds)) {
      const error = new Error("queueId and serviceIds are required");
      error.status = 400;
      throw error;
    }

    const dataToInsert = serviceIds.map((serviceId) => ({
      queueId,
      serviceId,
      createdBy,
      updatedBy,
    }));

    const result = await prisma.queueService.createMany({
      data: dataToInsert,
    });

    res
      .status(201)
      .json({ message: "QueueService created", count: result.count });
  } catch (error) {
    next(error);
  }
};

const getDocumentsByQueueId = async (req, res, next) => {
  try {
    const queueId = parseInt(req.params.queueId, 10);
    const queueServices = await prisma.queueService.findMany({
      where: { queueId },
      select: { serviceId: true },
    });

    const serviceIds = queueServices.map((q) => q.serviceId);

    if (serviceIds.length === 0) {
      const error = new Error("No services found for this queue");
      error.status = 404;
      throw error;
    }

    const documents = await prisma.document.findMany({
      where: {
        services: {
          some: {
            serviceId: { in: serviceIds },
          },
        },
      },
      distinct: ["id"],
    });

    res.status(200).json({ queueId: Number(queueId), documents });
  } catch (error) {
    next(error);
  }
};

module.exports = { createQueueService, getDocumentsByQueueId };
