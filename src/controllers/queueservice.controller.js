const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createQueueService = async (req, res, next) => {
  try {
    const username = req.user.username;
    const { queueId, serviceIds } = req.body;

    if (!queueId || !Array.isArray(serviceIds)) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const dataToInsert = serviceIds.map((serviceId) => ({
      queueId,
      serviceId,
      createdBy: username,
      updatedBy: username,
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
      throw Object.assign(new Error(), { status: 404 });
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

const getQueueServicesByQueueId = async (req, res, next) => {
  try {
    const { queueId } = req.params;

    if (!queueId) {
      throw Object.assign(new Error(), { status: 400 });
    }

    const queueServices = await prisma.queueService.findMany({
      where: { queueId: Number(queueId) },
      include: {
        service: true,
      },
    });

    res.status(200).json(queueServices);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQueueService,
  getDocumentsByQueueId,
  getQueueServicesByQueueId,
};
